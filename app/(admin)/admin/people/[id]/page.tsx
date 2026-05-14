import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ArrowLeft, CheckCircle2, Circle, Trophy, Calendar } from 'lucide-react'
import AssessmentCard from '@/components/admin/people/AssessmentCard'
import ReportsToEditor from '@/components/admin/people/ReportsToEditor'

const PHASE_CONFIGS = [
  { number: 1, name: 'Bienvenida',                   minDay: 1,  maxDay: 3  },
  { number: 2, name: 'Conocimiento PropHero',         minDay: 4,  maxDay: 6  },
  { number: 3, name: 'Journey del inversor',          minDay: 7,  maxDay: 10 },
  { number: 4, name: 'Settlement y Post Settlement',  minDay: 11, maxDay: 14 },
  { number: 5, name: 'Rentals',                       minDay: 15, maxDay: 18 },
  { number: 6, name: 'Simulaciones',                  minDay: 19, maxDay: 20 },
]

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Sin iniciar', bg: 'var(--bg-elevated)',   color: 'var(--text-muted)' },
  in_progress:  { label: 'En curso',   bg: 'var(--accent-dim)',     color: 'var(--accent)'     },
  completed:    { label: 'Completado', bg: 'rgba(34,197,94,0.12)', color: '#22c55e'            },
}

const MOOD_CONFIG: Record<string, { color: string; label: string }> = {
  great:      { color: '#22c55e', label: 'Muy bien'    },
  good:       { color: '#86efac', label: 'Bien'        },
  neutral:    { color: '#fbbf24', label: 'Normal'      },
  tired:      { color: '#f97316', label: 'Cansado'     },
  overwhelmed:{ color: '#ef4444', label: 'Agobiado'    },
}

function Avatar({ name, size = 48 }: { name: string; size?: number }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{
        width: size, height: size,
        fontSize: size * 0.3,
        background: 'var(--accent-dim)',
        color: 'var(--accent)',
        border: '2px solid rgba(45,91,227,0.3)',
      }}
    >
      {initials}
    </div>
  )
}

function Card({ title, children, badge }: { title: string; children: React.ReactNode; badge?: React.ReactNode }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
        {badge}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  )
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

type ProgressRow = {
  status: string
  completed_at: string | null
  onboarding_steps: { title: string; type: string; step_order: number } | null
}

type Assessment = {
  id: string
  score: number | null
  passed: boolean | null
  xp_earned: number | null
  completed_at: string | null
  ai_overall_feedback: string | null
  answers: unknown
  assessments: { title: string } | null
}

type Checkin = {
  checkin_date: string
  mood: string | null
  energy_level: number | null
  ai_summary: string | null
}

export default async function PersonDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile) redirect('/login')
  const tenantId = adminProfile.tenant_id as string

  const admin = createAdminClient()

  const [employeeResult, progressResult, assessmentsResult, checkinsResult] = await Promise.all([
    admin
      .from('users')
      .select(`
        id, full_name, email, job_title, role, onboarding_status, hire_date, reports_to,
        teams!users_team_id_fkey(name),
        employee_profiles(xp_total, current_level, last_sentiment, onboarding_day,
                          strengths, growth_areas, notes_for_manager)
      `)
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single(),

    admin
      .from('user_onboarding_progress')
      .select('status, completed_at, onboarding_steps(title, type, step_order)')
      .eq('user_id', id)
      .eq('tenant_id', tenantId)
      .order('created_at'),

    admin
      .from('user_assessments')
      .select('id, score, passed, xp_earned, completed_at, ai_overall_feedback, answers, assessments(title)')
      .eq('user_id', id)
      .eq('tenant_id', tenantId)
      .order('completed_at', { ascending: false }),

    admin
      .from('daily_checkins')
      .select('checkin_date, mood, energy_level, ai_summary')
      .eq('user_id', id)
      .eq('tenant_id', tenantId)
      .order('checkin_date', { ascending: false })
      .limit(7),
  ])

  console.log('PEOPLE DETAIL - employeeId:', id)
  console.log('PEOPLE DETAIL - employee:', employeeResult.data)
  console.log('PEOPLE DETAIL - progress count:', progressResult.data?.length)
  console.log('PEOPLE DETAIL - assessments count:', assessmentsResult.data?.length)

  if (!employeeResult.data) notFound()

  const emp = employeeResult.data as unknown as {
    id: string
    full_name: string
    email: string
    job_title: string | null
    role: string | null
    onboarding_status: string | null
    hire_date: string | null
    reports_to: string | null
    teams: { name: string } | null
    employee_profiles: {
      xp_total: number | null
      current_level: string | null
      last_sentiment: string | null
      onboarding_day: number | null
      strengths: string[] | null
      growth_areas: string[] | null
      notes_for_manager: string | null
    } | null
  }

  const progress = (progressResult.data ?? []) as unknown as ProgressRow[]
  const assessments = (assessmentsResult.data ?? []) as unknown as Assessment[]
  const checkins = (checkinsResult.data ?? []) as unknown as Checkin[]

  const ep = emp.employee_profiles
  const teamName = emp.teams?.name ?? '—'
  const statusCfg = STATUS_CONFIG[emp.onboarding_status ?? ''] ?? STATUS_CONFIG.not_started

  const completedSteps = progress.filter(r => r.status === 'completed').length
  const totalSteps = progress.length
  const overallPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  // Group progress into phases
  const phases = PHASE_CONFIGS
    .map(cfg => {
      const steps = progress.filter(r => {
        const order = r.onboarding_steps?.step_order ?? 0
        return order >= cfg.minDay && order <= cfg.maxDay
      })
      if (steps.length === 0) return null
      const done = steps.filter(s => s.status === 'completed').length
      return { ...cfg, steps, done, total: steps.length }
    })
    .filter(Boolean) as Array<{
      number: number; name: string; steps: ProgressRow[]; done: number; total: number
    }>

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Back link */}
      <Link
        href="/admin/people"
        className="self-start inline-flex items-center gap-2 text-sm hover:opacity-80 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <ArrowLeft size={15} />
        Volver a Personas
      </Link>

      {/* Header */}
      <div
        className="rounded-xl p-6 flex items-start gap-5"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <Avatar name={emp.full_name} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {emp.full_name}
            </h1>
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ background: statusCfg.bg, color: statusCfg.color }}
            >
              {statusCfg.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
            {emp.job_title && <span>{emp.job_title}</span>}
            <span>{teamName}</span>
            <span className="capitalize">{emp.role ?? '—'}</span>
            {emp.hire_date && (
              <span className="flex items-center gap-1">
                <Calendar size={13} />
                Ingresó {formatDate(emp.hire_date)}
              </span>
            )}
          </div>
          {emp.email && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{emp.email}</p>
          )}
          <div className="mt-2">
            <ReportsToEditor employeeId={emp.id} currentReportsToId={emp.reports_to} />
          </div>
        </div>
        {ep?.xp_total != null && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Trophy size={16} style={{ color: '#f59e0b' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {ep.xp_total.toLocaleString('es')} XP
            </span>
          </div>
        )}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5">

          {/* Onboarding progress */}
          <Card title="Progreso de onboarding">
            <div className="flex flex-col gap-4">
              {/* Overall bar */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{completedSteps} de {totalSteps} pasos completados</span>
                  <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{overallPct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${overallPct}%`, background: 'var(--accent)' }}
                  />
                </div>
              </div>

              {/* Phases */}
              {phases.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin pasos registrados.</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {phases.map(phase => {
                    const phasePct = phase.total > 0 ? Math.round((phase.done / phase.total) * 100) : 0
                    return (
                      <div key={phase.number}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {phase.number}. {phase.name}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {phase.done}/{phase.total}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden mb-2" style={{ background: 'var(--bg-elevated)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${phasePct}%`, background: phasePct === 100 ? '#22c55e' : 'var(--accent)' }}
                          />
                        </div>
                        <div className="flex flex-col gap-1">
                          {phase.steps.map((s, i) => {
                            const done = s.status === 'completed'
                            const title = s.onboarding_steps?.title ?? `Paso ${i + 1}`
                            return (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span style={{ color: done ? '#22c55e' : 'var(--text-muted)', flexShrink: 0 }}>
                                  {done ? <CheckCircle2 size={13} /> : <Circle size={13} />}
                                </span>
                                <span
                                  style={{
                                    color: done ? 'var(--text-secondary)' : 'var(--text-primary)',
                                    textDecoration: done ? 'line-through' : undefined,
                                    opacity: done ? 0.6 : 1,
                                  }}
                                >
                                  {title}
                                </span>
                                {done && s.completed_at && (
                                  <span className="ml-auto flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                                    {formatDate(s.completed_at)}
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </Card>

          {/* XP & Level */}
          <Card title="XP & Nivel">
            {ep ? (
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {(ep.xp_total ?? 0).toLocaleString('es')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>XP total</p>
                </div>
                <div>
                  <p className="text-2xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
                    {ep.current_level ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nivel actual</p>
                </div>
                {ep.onboarding_day != null && (
                  <div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {ep.onboarding_day}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Día de onboarding</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin datos de perfil.</p>
            )}
          </Card>

          {/* Manager notes */}
          {ep?.notes_for_manager && (
            <Card
              title="Notas para el manager"
              badge={
                <span
                  className="text-xs px-2 py-0.5 rounded-full ml-auto"
                  style={{ background: 'rgba(251,191,36,0.15)', color: '#d97706' }}
                >
                  Solo visible para managers
                </span>
              }
            >
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {ep.notes_for_manager}
              </p>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-5">

          {/* Assessments */}
          <AssessmentCard assessments={assessments} />

          {/* Check-ins */}
          <Card title="Últimos check-ins">
            {checkins.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin check-ins registrados.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {checkins.map((c, i) => {
                  const mood = MOOD_CONFIG[c.mood ?? '']
                  return (
                    <div
                      key={i}
                      className="flex items-start gap-3 py-2"
                      style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                        style={{ background: mood?.color ?? 'var(--text-muted)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                            {mood?.label ?? c.mood ?? '—'}
                          </span>
                          {c.energy_level != null && (
                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              · Energía {c.energy_level}/5
                            </span>
                          )}
                        </div>
                        {c.ai_summary && (
                          <p className="text-xs mt-0.5 leading-relaxed line-clamp-2" style={{ color: 'var(--text-muted)' }}>
                            {c.ai_summary}
                          </p>
                        )}
                      </div>
                      <span className="text-xs flex-shrink-0" style={{ color: 'var(--text-muted)' }}>
                        {new Date(c.checkin_date).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Strengths & growth */}
          {(ep?.strengths?.length || ep?.growth_areas?.length) ? (
            <Card title="Fortalezas y áreas de mejora">
              <div className="flex flex-col gap-4">
                {ep?.strengths && ep.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                      Fortalezas
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ep.strengths.map((s, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.2)' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {ep?.growth_areas && ep.growth_areas.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
                      Áreas de mejora
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ep.growth_areas.map((g, i) => (
                        <span
                          key={i}
                          className="text-xs px-2.5 py-1 rounded-full"
                          style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706', border: '1px solid rgba(251,191,36,0.2)' }}
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

        </div>
      </div>
    </div>
  )
}
