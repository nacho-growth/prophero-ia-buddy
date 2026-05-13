import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import Anthropic from '@anthropic-ai/sdk'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

const schema = z.object({
  stepId: z.string().uuid(),
  stepTitle: z.string(),
  action: z.enum(['generate', 'evaluate']),
  questions: z.array(z.object({
    question: z.string(),
    type: z.enum(['multiple_choice', 'open_ended']),
    options: z.array(z.string()).optional(),
    correctOption: z.string().optional(),
  })).optional(),
  answers: z.array(z.string()).optional(),
  passingScore: z.number().default(70),
})

async function getEmbedding(text: string): Promise<number[]> {
  const { default: OpenAI } = await import('openai')
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  const res = await openai.embeddings.create({ model: 'text-embedding-3-small', input: text })
  return res.data[0].embedding
}

function extractJson(text: string): string {
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  return match ? match[1] : text.trim()
}

export async function POST(request: NextRequest) {
  console.log('=== ASSESSMENT ROUTE HIT ===', request.url)

  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('=== ASSESSMENT SCHEMA ERROR ===', parsed.error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  const { action, stepTitle, questions, answers, passingScore } = parsed.data
  const admin = createAdminClient()

  // ── Generate questions ──────────────────────────────────────────────────────

  if (action === 'generate') {
    console.log('ASSESSMENT DEBUG - generate for step:', stepTitle)

    let knowledgeContext = ''
    try {
      const embedding = await getEmbedding(stepTitle)
      const { data: chunks, error: chunksError } = await admin.rpc('match_knowledge_chunks_hybrid', {
        query_embedding: `[${embedding.join(',')}]` as unknown as number[],
        query_text: stepTitle,
        match_tenant_id: auth.tenantId,
        match_count: 6,
      })
      console.log('ASSESSMENT DEBUG - chunks found:', chunks?.length ?? 0, 'error:', chunksError)
      if (chunks && (chunks as Array<{ content: string }>).length > 0) {
        knowledgeContext = (chunks as Array<{ content: string }>).map(c => c.content).join('\n\n')
      }
    } catch (e) {
      console.error('ASSESSMENT DEBUG - embedding/search error:', e)
    }

    const systemPrompt = [
      `Eres un evaluador experto de PropHero. Tu tarea es generar preguntas de assessment para evaluar si un empleado aprendió el tema: "${stepTitle}".`,
      'Basándote en el siguiente contenido del knowledge base, generá entre 3 y 7 preguntas.',
      'La cantidad debe ser proporcional a la complejidad del tema.',
      'Mezclá preguntas de multiple choice (con 4 opciones, una correcta) y preguntas abiertas.',
      'Las preguntas deben ser exigentes — no triviales. El empleado debe demostrar comprensión real.',
      'Respondé SOLO con un JSON válido con esta estructura:',
      '{"questions":[{"question":"texto","type":"multiple_choice","options":["A","B","C","D"],"correctOption":"A"},{"question":"texto","type":"open_ended"}]}',
      knowledgeContext ? `\nConocimiento disponible:\n${knowledgeContext}` : '',
    ].filter(Boolean).join('\n')

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Generá las preguntas de assessment para: "${stepTitle}"` }],
      })
      const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
      console.log('ASSESSMENT DEBUG - generate response preview:', rawText.substring(0, 300))
      const data = JSON.parse(extractJson(rawText))
      return NextResponse.json(data)
    } catch (e) {
      console.error('ASSESSMENT DEBUG - generate error:', e)
      return NextResponse.json({ error: 'Error al generar preguntas' }, { status: 500 })
    }
  }

  // ── Evaluate answers ────────────────────────────────────────────────────────

  if (!questions || !answers) {
    return NextResponse.json({ error: 'questions and answers required for evaluate' }, { status: 400 })
  }

  console.log('ASSESSMENT DEBUG - evaluate', questions.length, 'questions')

  const questionsText = questions.map((q, i) => {
    const ans = answers[i] ?? '(sin respuesta)'
    if (q.type === 'multiple_choice') {
      return `Pregunta ${i + 1} (multiple choice): ${q.question}\nOpciones: ${(q.options ?? []).join(' | ')}\nRespuesta correcta: ${q.correctOption ?? ''}\nRespuesta del empleado: ${ans}`
    }
    return `Pregunta ${i + 1} (abierta): ${q.question}\nRespuesta del empleado: ${ans}`
  }).join('\n\n')

  const evalSystemPrompt = [
    'Eres un evaluador experto de PropHero. Evaluá las respuestas del empleado.',
    'Para cada pregunta:',
    '- Si es multiple_choice: verificá si eligió la opción correcta.',
    '- Si es open_ended: evaluá la comprensión conceptual (no busques respuesta exacta).',
    'Para cada respuesta dá: correct (true/false) y feedback (2-3 líneas específicas; si está mal, explicá el concepto correcto).',
    `Al final calculá el score (% de correctas). El mínimo para aprobar es ${passingScore}%.`,
    'Respondé SOLO con JSON válido:',
    '{"results":[{"correct":true,"feedback":"..."}],"score":85,"passed":true,"generalFeedback":"..."}',
  ].join('\n')

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      system: evalSystemPrompt,
      messages: [{ role: 'user', content: questionsText }],
    })
    const rawText = response.content[0].type === 'text' ? response.content[0].text : ''
    console.log('ASSESSMENT DEBUG - evaluate response preview:', rawText.substring(0, 300))
    const data = JSON.parse(extractJson(rawText)) as {
      results: Array<{ correct: boolean; feedback: string }>
      score: number
      passed: boolean
      generalFeedback: string
    }

    const { stepId, stepTitle } = parsed.data

    // Find or create assessment record for this step
    console.log('ASSESSMENT DEBUG - looking up assessment for step:', stepId)
    const { data: existingAssessment } = await admin
      .from('assessments')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .contains('trigger_config', { step_id: stepId })
      .maybeSingle()

    let assessmentId = existingAssessment?.id
    console.log('ASSESSMENT DEBUG - existing assessment id:', assessmentId ?? 'none')

    if (!assessmentId) {
      const { data: newAssessment } = await admin
        .from('assessments')
        .insert({
          tenant_id: auth.tenantId,
          team_id: null,
          title: `Assessment: ${stepTitle}`,
          type: 'quiz',
          trigger_type: 'onboarding_step',
          trigger_config: { step_id: stepId },
          xp_reward: 100,
          passing_score: passingScore,
        })
        .select('id')
        .single()
      assessmentId = (newAssessment as { id: string } | null)?.id
      console.log('ASSESSMENT DEBUG - created new assessment id:', assessmentId ?? 'failed')
    }

    if (assessmentId) {
      const { error: attemptError } = await admin.from('user_assessments').insert({
        user_id: auth.userId,
        assessment_id: assessmentId,
        tenant_id: auth.tenantId,
        status: 'completed',
        score: data.score,
        passed: data.passed ?? false,
        xp_earned: data.passed ? 100 : 0,
        answers: questions.map((q, i) => ({
          question: q.question,
          answer: answers[i],
          correct: data.results[i]?.correct ?? false,
          ai_feedback: data.results[i]?.feedback ?? '',
        })),
        ai_overall_feedback: data.generalFeedback,
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      console.log('ASSESSMENT DEBUG - saved to user_assessments, score:', data.score, 'passed:', data.passed, 'error:', attemptError)

      if (data.passed) {
        const { error: xpError } = await admin.from('xp_events').insert({
          user_id: auth.userId,
          tenant_id: auth.tenantId,
          xp_amount: 100,
          reason: 'assessment_completed',
          reference_type: 'assessments',
          reference_id: assessmentId,
        })
        console.log('ASSESSMENT DEBUG - xp_events insert error:', xpError)

        const { data: ep } = await admin
          .from('employee_profiles')
          .select('xp_total')
          .eq('user_id', auth.userId)
          .eq('tenant_id', auth.tenantId)
          .single()

        if (ep) {
          const { error: epError } = await admin
            .from('employee_profiles')
            .update({ xp_total: ((ep as { xp_total: number }).xp_total ?? 0) + 100 })
            .eq('user_id', auth.userId)
            .eq('tenant_id', auth.tenantId)
          console.log('ASSESSMENT DEBUG - employee_profiles xp update error:', epError)
        }
      }
    }

    return NextResponse.json(data)
  } catch (e) {
    console.error('ASSESSMENT DEBUG - evaluate error:', e)
    return NextResponse.json({ error: 'Error al evaluar respuestas' }, { status: 500 })
  }
}
