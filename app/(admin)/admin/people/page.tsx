import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { Users } from 'lucide-react'

type Employee = {
  id: string
  full_name: string
  email: string
  job_title: string | null
  role: string | null
  onboarding_status: string | null
  hire_date: string | null
  last_active_at: string | null
  teams: { name: string } | null
  employee_profiles: {
    xp_total: number | null
    current_level: string | null
    last_sentiment: string | null
    onboarding_day: number | null
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Sin iniciar', bg: 'var(--bg-elevated)',      color: 'var(--text-muted)' },
  in_progress:  { label: 'En curso',   bg: 'var(--accent-dim)',        color: 'var(--accent)'     },
  completed:    { label: 'Completado', bg: 'rgba(34,197,94,0.12)',     color: '#22c55e'           },
}

const SENTIMENT_EMOJI: Record<string, string> = {
  great: '😊', good: '🙂', neutral: '😐', tired: '😴', overwhelmed: '😰',
}

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? STATUS_CONFIG.not_started
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: cfg.bg, color: cfg.color }}
    >
      {cfg.label}
    </span>
  )
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(45,91,227,0.3)' }}
    >
      {initials}
    </div>
  )
}

function formatRelativeDate(date: string | null): string {
  if (!date) return '—'
  const diffDays = Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem`
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

export default async function PeoplePage() {
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
  console.log('ADMIN PEOPLE - adminProfile:', adminProfile)
  console.log('ADMIN PEOPLE - tenantId:', tenantId)

  const admin = createAdminClient()

  const { data: employeesRaw, error: empError } = await admin
    .from('users')
    .select(`
      id, full_name, email, job_title, role, onboarding_status, hire_date, last_active_at,
      teams!users_team_id_fkey(name),
      employee_profiles(xp_total, current_level, last_sentiment, onboarding_day)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .order('full_name')
  console.log('ADMIN PEOPLE - employeesRaw count:', employeesRaw?.length, 'empError:', empError)

  const { data: progressRows } = await admin
    .from('user_onboarding_progress')
    .select('user_id, status')
    .eq('tenant_id', tenantId)
  console.log('ADMIN PEOPLE - progressRows count:', progressRows?.length)

  const progressByUser: Record<string, { total: number; completed: number }> = {}
  for (const row of progressRows ?? []) {
    const uid = row.user_id as string
    if (!progressByUser[uid]) progressByUser[uid] = { total: 0, completed: 0 }
    progressByUser[uid].total++
    if (row.status === 'completed') progressByUser[uid].completed++
  }

  const employees = (employeesRaw ?? []) as unknown as Employee[]

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Personas</h1>
        <span
          className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
        >
          {employees.length}
        </span>
      </div>

      {employees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
          <Users size={36} style={{ opacity: 0.3 }} />
          <p className="text-sm">No hay empleados registrados.</p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden"
          style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                {['Empleado', 'Equipo', 'Rol', 'Onboarding', 'Progreso', 'Nivel', 'Ánimo', 'Último acceso'].map(h => (
                  <th
                    key={h}
                    className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map((emp, i) => {
                const prog = progressByUser[emp.id] ?? { total: 0, completed: 0 }
                const pct = prog.total > 0 ? Math.round((prog.completed / prog.total) * 100) : 0
                const ep = emp.employee_profiles
                const teamName = emp.teams?.name ?? '—'

                return (
                  <tr
                    key={emp.id}
                    style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/people/${emp.id}`}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                      >
                        <Avatar name={emp.full_name} />
                        <div>
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {emp.full_name}
                          </p>
                          {emp.job_title && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                              {emp.job_title}
                            </p>
                          )}
                        </div>
                      </Link>
                    </td>

                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                      {teamName}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className="text-xs px-2 py-0.5 rounded-full capitalize"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        {emp.role ?? '—'}
                      </span>
                    </td>

                    <td className="px-4 py-3">
                      <StatusBadge status={emp.onboarding_status} />
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1" style={{ minWidth: 90 }}>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {prog.completed}/{prog.total} pasos
                        </span>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, background: 'var(--accent)' }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {ep?.current_level ? (
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded-full capitalize"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                        >
                          {ep.current_level}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>

                    <td className="px-4 py-3 text-base">
                      {ep?.last_sentiment ? (SENTIMENT_EMOJI[ep.last_sentiment] ?? '—') : '—'}
                    </td>

                    <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeDate(emp.last_active_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
