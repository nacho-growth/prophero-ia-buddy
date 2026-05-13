import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Result } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface CallClaudeInput {
  userId: string
  tenantId: string
  conversationId: string
  userMessage: string
  accessToken: string
}

interface CallClaudeOutput {
  content: string
  conversationId: string
}

async function getEmbedding(text: string): Promise<number[]> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  })
  return response.data[0].embedding
}

export async function callClaude(input: CallClaudeInput): Promise<Result<CallClaudeOutput>> {
  const { userId, tenantId, conversationId, userMessage, accessToken } = input
  console.log('CLAUDE DEBUG - params:', JSON.stringify({ tenantId, userId, conversationId, userMessageLength: userMessage.length }))
  const admin = createAdminClient()
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
  )

  // Step 1: Load tenant + skills
  const [{ data: tenant, error: tenantError }, { data: skills, error: skillsError }] = await Promise.all([
    admin.from('tenants').select('name, agent_name, agent_persona').eq('id', tenantId).single(),
    admin.from('tenant_skills').select('skill_id, is_enabled, skills(slug, name, system_prompt_addon)').eq('tenant_id', tenantId).eq('is_enabled', true),
  ])
  console.log('TENANT DEBUG - raw tenant data:', JSON.stringify(tenant))
  console.log('TENANT DEBUG - agent_persona value:', (tenant as any)?.agent_persona)
  console.log('TENANT DEBUG - tenant error:', JSON.stringify(tenantError))
  console.log('TENANT DEBUG - skills error:', JSON.stringify(skillsError))

  // Step 2: Load employee context (using user's session so RLS resolves auth.uid())
  const [{ data: userRow }, { data: empProfile }] = await Promise.all([
    supabase.from('users').select('full_name, job_title').eq('id', userId).eq('tenant_id', tenantId).single(),
    supabase.from('employee_profiles').select('onboarding_day, xp_total, current_level, last_sentiment').eq('user_id', userId).eq('tenant_id', tenantId).single(),
  ])
  console.log('PROFILE DEBUG - userId:', userId)
  console.log('PROFILE DEBUG - userRow:', JSON.stringify(userRow))
  console.log('PROFILE DEBUG - empProfile:', JSON.stringify(empProfile))

  // Step 3: Retrieve knowledge chunks via pgvector similarity search
  let knowledgeContext = ''
  let rawChunks: Array<{ content: string }> | null = null
  try {
    const embedding = await getEmbedding(userMessage)
    console.log('KNOWLEDGE DEBUG - embedding generated, length:', embedding.length)
    const { data: chunks, error: chunksError } = await admin.rpc('match_knowledge_chunks_hybrid', {
      query_embedding: `[${embedding.join(',')}]` as unknown as number[],
      query_text: userMessage,
      match_tenant_id: tenantId,
      match_count: 8,
    })
    console.log('RPC DEBUG - full result:', JSON.stringify({
      data: chunks,
      error: chunksError,
      embeddingLength: embedding.length,
      tenantId: tenantId,
    }))
    console.log('KNOWLEDGE DEBUG - raw rpc result:', JSON.stringify({
      dataLength: chunks?.length,
      firstItem: (chunks as any)?.[0],
      error: chunksError,
    }))
    console.log('KNOWLEDGE DEBUG - chunks found:', chunks?.length ?? 0)
    console.log('KNOWLEDGE DEBUG - chunks error:', chunksError)
    console.log('KNOWLEDGE DEBUG - similarities:', (chunks as any[])?.map((c: any) => c.similarity?.toFixed(3)))
    const goodChunks = (chunks ?? []) as Array<{ content: string; similarity: number }>
    if (goodChunks.length) {
      rawChunks = goodChunks
      knowledgeContext = goodChunks.map(c => c.content).join('\n\n')
    }
  } catch (e) {
    console.error('KNOWLEDGE DEBUG - exception:', e)
  }

  // Step 4: Load conversation history (last 20 messages)
  const { data: history } = await admin
    .from('messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(20)

  // Step 5: Assemble system prompt
  const agentName = (tenant as { agent_name?: string } | null)?.agent_name ?? 'IA Buddy'
  const tenantName = (tenant as { name?: string } | null)?.name ?? 'tu empresa'
  const agentPersona = (tenant as { agent_persona?: string } | null)?.agent_persona ?? null
  const typedUser = userRow as { full_name?: string; job_title?: string } | null
  const typedEmpProfile = empProfile as { onboarding_day?: number; xp_total?: number; current_level?: string; last_sentiment?: string } | null
  const typedSkills = skills as Array<{ skills: { slug: string; name: string; system_prompt_addon: string } | null }> | null

  const skillsSection = typedSkills?.length
    ? typedSkills.map(ts => ts.skills?.system_prompt_addon).filter(Boolean).join('\n\n')
    : ''

  const systemPrompt = [
    agentPersona ?? `Eres ${agentName}, el asistente de onboarding de ${tenantName}. Tu rol es ayudar a los nuevos empleados a integrarse con éxito en su primer mes.`,
    skillsSection,
    `\n## Empleado\nNombre: ${typedUser?.full_name ?? 'empleado'}\nCargo: ${typedUser?.job_title ?? 'no especificado'}\nDía de onboarding: ${typedEmpProfile?.onboarding_day ?? 1}\nNivel: ${typedEmpProfile?.current_level ?? 'junior'}`,
    knowledgeContext ? `\n## Conocimiento relevante\n${knowledgeContext}` : '',
    `\n## Instrucciones\n- Responde siempre en español\n- Sé conciso, amable y motivador\n- Si no tienes información suficiente para responder, indícalo claramente`,
  ].filter(Boolean).join('\n')
  console.log('KNOWLEDGE DEBUG - system prompt preview:', systemPrompt.substring(0, 200))
  console.log('KNOWLEDGE DEBUG - chunks content preview:', rawChunks?.slice(0, 2).map(c => c.content?.substring(0, 100)))

  // Step 6: Call Claude API
  const messages: Anthropic.MessageParam[] = [
    ...(history ?? []).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content as string,
    })),
    { role: 'user', content: userMessage },
  ]

  let assistantContent: string
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    })
    const block = response.content[0]
    assistantContent = block.type === 'text' ? block.text : ''
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error al contactar Claude'
    return { ok: false, error: message }
  }

  // Step 7: Save assistant message
  const { error: assistantMsgError } = await admin.from('messages').insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    user_id: userId,
    role: 'assistant',
    content: assistantContent,
  })
  if (assistantMsgError) console.error('=== ASSISTANT MSG INSERT ERROR ===', JSON.stringify(assistantMsgError))

  // Step 8: Knowledge gap detection
  const gapPhrases = [
    'no tengo información',
    'no sé ',
    'no estoy seguro',
    'no puedo responder',
    'no tengo acceso',
    'no cuento con',
    'desconozco',
    "i don't know",
    'no tengo datos',
  ]
  const lower = assistantContent.toLowerCase()
  if (gapPhrases.some(p => lower.includes(p))) {
    await admin.from('knowledge_gaps').insert({
      tenant_id: tenantId,
      user_id: userId,
      question: userMessage,
    })
  }

  return { ok: true, data: { content: assistantContent, conversationId } }
}
