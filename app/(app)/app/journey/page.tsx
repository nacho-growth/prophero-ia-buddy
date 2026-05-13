import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, BookOpen } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { completeStep } from '@/app/actions/onboarding'
import JourneyPhase, { type PhaseData } from '@/components/journey/JourneyPhase'
import type { StepData } from '@/components/journey/JourneyStep'
import ScrollToStep from '@/components/journey/ScrollToStep'

type RawStep = {
  id: string
  title: string
  description: string | null
  type: string
  step_order: number
  estimated_minutes: number | null
  content: unknown
}

type RawProgressRow = {
  id: string
  status: string
  completed_at: string | null
  onboarding_steps: RawStep | null
}

const PHASE_CONFIGS = [
  { number: 1, name: 'Bienvenida',                   minDay: 1,  maxDay: 3  },
  { number: 2, name: 'Conocimiento PropHero',         minDay: 4,  maxDay: 6  },
  { number: 3, name: 'Journey del inversor',          minDay: 7,  maxDay: 10 },
  { number: 4, name: 'Settlement y Post Settlement',  minDay: 11, maxDay: 14 },
  { number: 5, name: 'Rentals',                       minDay: 15, maxDay: 18 },
  { number: 6, name: 'Simulaciones',                  minDay: 19, maxDay: 20 },
]

export default async function JourneyPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, tenant_id, onboarding_status')
    .eq('id', userId)
    .single()

  if (!profile) redirect('/login')

  const tenantId = profile.tenant_id as string

  const { data: stepsData } = await supabase
    .from('user_onboarding_progress')
    .select('id, status, completed_at, onboarding_steps(id, title, description, type, step_order, estimated_minutes, content)')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  const sortedSteps = (stepsData ?? []).sort((a, b) => {
    const orderA = (a.onboarding_steps as unknown as { step_order: number } | null)?.step_order ?? 0
    const orderB = (b.onboarding_steps as unknown as { step_order: number } | null)?.step_order ?? 0
    return orderA - orderB
  })

  const rows = sortedSteps as unknown as RawProgressRow[]

  const allSteps: StepData[] = rows
    .filter(r => r.onboarding_steps != null)
    .map(r => ({
      progressId: r.id,
      status: r.status as StepData['status'],
      id: r.onboarding_steps!.id,
      title: r.onboarding_steps!.title,
      description: r.onboarding_steps!.description,
      type: r.onboarding_steps!.type,
      dayNumber: r.onboarding_steps!.step_order,
      estimatedMinutes: r.onboarding_steps!.estimated_minutes,
      content: r.onboarding_steps!.content ?? null,
    }))

  if (allSteps.length === 0) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi camino</h1>
        <div
          className="rounded-xl p-6 flex flex-col gap-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <BookOpen size={20} style={{ color: 'var(--text-muted)' }} />
            <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
              Plan de onboarding en preparación
            </p>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Tu equipo aún no tiene un plan de onboarding configurado. Tu manager está preparando el contenido — mientras tanto, podés preguntarle a Buddy cualquier duda.
          </p>
          <Link
            href="/app/chat"
            className="self-start inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <MessageCircle size={15} />
            Preguntarle a Buddy
          </Link>
        </div>
      </div>
    )
  }

  const totalSteps = allSteps.length
  const completedTotal = allSteps.filter(s => s.status === 'completed').length
  const overallPct = totalSteps > 0 ? Math.round((completedTotal / totalSteps) * 100) : 0

  // Build phases, skipping those with no steps
  const phases: PhaseData[] = []
  let prevCompleted = true

  for (const config of PHASE_CONFIGS) {
    const phaseSteps = allSteps.filter(
      s => s.dayNumber >= config.minDay && s.dayNumber <= config.maxDay
    )
    if (phaseSteps.length === 0) continue

    const allDone = phaseSteps.every(s => s.status === 'completed')
    const status: PhaseData['status'] = !prevCompleted
      ? 'locked'
      : allDone
        ? 'completed'
        : 'in_progress'

    phases.push({
      number: config.number,
      name: config.name,
      steps: phaseSteps,
      status,
      completedCount: phaseSteps.filter(s => s.status === 'completed').length,
    })

    prevCompleted = allDone
  }

  const activePhaseIdx = phases.findIndex(p => p.status === 'in_progress')
  const actionableStep = activePhaseIdx >= 0
    ? phases[activePhaseIdx].steps.find(s => s.status === 'pending')
    : null

  const boundAction = actionableStep
    ? completeStep.bind(null, actionableStep.progressId, userId, tenantId)
    : null

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Mi camino</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            {completedTotal} de {totalSteps} pasos completados
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 rounded-full h-2.5" style={{ background: 'var(--bg-elevated)' }}>
            <div
              className="rounded-full h-2.5 transition-all"
              style={{ width: `${overallPct}%`, background: 'var(--accent)' }}
            />
          </div>
          <span className="text-sm font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>
            {overallPct}%
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {phases.map((phase, idx) => (
          <JourneyPhase
            key={phase.number}
            phase={phase}
            boundCompleteAction={idx === activePhaseIdx ? boundAction : null}
          />
        ))}
      </div>
      <ScrollToStep />
    </div>
  )
}
