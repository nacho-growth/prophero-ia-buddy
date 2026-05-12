import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import type { Result } from '@/lib/utils'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

interface CallClaudeInput {
  userId: string
  tenantId: string
  conversationId: string
  userMessage: string
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
  const { userId, tenantId, conversationId, userMessage } = input
  const admin = createAdminClient()

  // Step 1: Load tenant + skills
  const [{ data: tenant }, { data: skills }] = await Promise.all([
    admin.from('tenants').select('name, agent_name').eq('id', tenantId).single(),
    admin.from('tenant_skills').select('name, content').eq('tenant_id', tenantId).eq('enabled', true),
  ])

  // Step 2: Load employee context
  const [{ data: profile }, { data: empProfile }] = await Promise.all([
    admin.from('users').select('full_name, job_title').eq('id', userId).eq('tenant_id', tenantId).single(),
    admin.from('employee_profiles').select('xp_total, current_level, onboarding_day').eq('user_id', userId).eq('tenant_id', tenantId).single(),
  ])

  // Step 3: Retrieve knowledge chunks via pgvector similarity search
  let knowledgeContext = ''
  try {
    const embedding = await getEmbedding(userMessage)
    const { data: chunks } = await admin.rpc('match_knowledge_chunks', {
      query_embedding: embedding,
      match_tenant_id: tenantId,
      match_count: 5,
    })
    if (chunks?.length) {
      knowledgeContext = (chunks as Array<{ content: string }>)
        .map(c => c.content)
        .join('\n\n')
    }
  } catch {
    // pgvector not set up or embedding failed — continue without knowledge context
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
  const typedProfile = profile as { full_name?: string; job_title?: string } | null
  const typedEmpProfile = empProfile as { current_level?: string; onboarding_day?: number } | null
  const typedSkills = skills as Array<{ name: string; content: string }> | null

  const skillsSection = typedSkills?.length
    ? `\n## Contexto de la empresa\n${typedSkills.map(s => `### ${s.name}\n${s.content}`).join('\n\n')}`
    : ''

  const systemPrompt = [
    `Eres ${agentName}, el asistente de onboarding de ${tenantName}.`,
    `Tu rol es ayudar a los nuevos empleados a integrarse con éxito en su primer mes.`,
    skillsSection,
    `\n## Empleado\nNombre: ${typedProfile?.full_name ?? 'empleado'}\nCargo: ${typedProfile?.job_title ?? 'no especificado'}\nDía de onboarding: ${typedEmpProfile?.onboarding_day ?? 1}\nNivel: ${typedEmpProfile?.current_level ?? 'junior'}`,
    knowledgeContext ? `\n## Conocimiento relevante\n${knowledgeContext}` : '',
    `\n## Instrucciones\n- Responde siempre en español\n- Sé conciso, amable y motivador\n- Si no tienes información suficiente para responder, indícalo claramente`,
  ].filter(Boolean).join('\n')

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
      model: 'claude-sonnet-4-20250514',
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
  await admin.from('messages').insert({
    conversation_id: conversationId,
    tenant_id: tenantId,
    user_id: userId,
    role: 'assistant',
    content: assistantContent,
  })

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
