import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const schema = z.object({
  stepId: z.string().uuid(),
  stepTitle: z.string(),
})

async function getEmbedding(text: string): Promise<number[]> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return res.data[0].embedding
}

export async function POST(request: NextRequest) {
  console.log('=== READING ROUTE HIT ===', request.url)

  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('=== READING SCHEMA ERROR ===', parsed.error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { stepId, stepTitle } = parsed.data
  const admin = createAdminClient()

  // Check DB cache first
  const { data: step } = await admin
    .from('onboarding_steps')
    .select('content')
    .eq('id', stepId)
    .eq('tenant_id', auth.tenantId)
    .single()

  const existingContent = step?.content as { generated_reading?: string; reading_status?: string } | null

  if (existingContent?.generated_reading && existingContent?.reading_status === 'published') {
    console.log('READING DEBUG - serving from cache')
    return NextResponse.json({ content: existingContent.generated_reading, status: 'published', fromCache: true })
  }
  if (existingContent?.generated_reading && existingContent?.reading_status === 'draft') {
    console.log('READING DEBUG - content in draft, awaiting approval')
    return NextResponse.json({ content: null, status: 'draft' })
  }

  // Search knowledge base
  let knowledgeContext = ''
  try {
    const embedding = await getEmbedding(stepTitle)
    const { data: chunks, error: chunksError } = await admin.rpc('match_knowledge_chunks_hybrid', {
      query_embedding: `[${embedding.join(',')}]` as unknown as number[],
      query_text: stepTitle,
      match_tenant_id: auth.tenantId,
      match_count: 10,
    })
    console.log('READING DEBUG - chunks found:', chunks?.length ?? 0, 'error:', chunksError)
    if (chunks && (chunks as Array<{ content: string }>).length > 0) {
      knowledgeContext = (chunks as Array<{ content: string }>).map(c => c.content).join('\n\n')
    }
  } catch (e) {
    console.error('READING DEBUG - embedding/search error:', e)
  }

  if (!knowledgeContext) {
    console.log('READING DEBUG - no chunks found, returning null content')
    return NextResponse.json({ content: null, status: 'draft' })
  }

  const systemPrompt = `Eres un instructor experto de PropHero. Tu tarea es crear material de estudio completo y pedagógico para un nuevo empleado del equipo de Investor Relations.
El tema es: "${stepTitle}"

Basándote en el conocimiento disponible, creá un documento de estudio que incluya:

## Introducción — qué es este tema y por qué es importante para el rol IR
## Conceptos clave — los 3-5 conceptos fundamentales que el empleado debe entender
## Cómo funciona en la práctica — el proceso paso a paso, con ejemplos concretos
## Lo que necesitás saber como IR — qué preguntas te puede hacer un inversor sobre este tema y cómo responderlas
## Puntos a recordar — resumen de los 3-5 takeaways más importantes

El documento debe ser:
- Completo y detallado — el empleado debe poder aprender el tema solo con esto
- Escrito en español, tono profesional pero accesible
- Con ejemplos concretos del negocio de PropHero
- Estructurado con headers claros usando markdown (## para secciones, **negrita** para términos clave)
- Entre 600 y 1200 palabras

Conocimiento disponible:
${knowledgeContext}`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Creá el material de estudio para: "${stepTitle}"` }],
    })
    const generatedMarkdown = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('READING DEBUG - content generated, length:', generatedMarkdown.length)

    // Save to DB as draft (awaiting admin approval)
    const updatedContent = {
      ...(step?.content as object ?? {}),
      generated_reading: generatedMarkdown,
      reading_status: 'draft',
      generated_at: new Date().toISOString(),
    }
    await admin
      .from('onboarding_steps')
      .update({ content: updatedContent })
      .eq('id', stepId)
      .eq('tenant_id', auth.tenantId)

    return NextResponse.json({ content: null, status: 'draft' })
  } catch (e) {
    console.error('READING DEBUG - claude error:', e)
    return NextResponse.json({ error: 'Error al generar contenido' }, { status: 500 })
  }
}
