'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Users, UserPlus, ChevronUp, ChevronDown } from 'lucide-react'
import InviteModal from './InviteModal'

interface AccessRequest {
  id: string
  email: string
  message: string | null
  created_at: string
}

export type Employee = {
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

interface Props {
  employees: Employee[]
  teams: { id: string; name: string }[]
  progressByUser: Record<string, { total: number; completed: number }>
  teamFilter: string | undefined
  accessRequests: AccessRequest[]
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  not_started: { label: 'Sin iniciar', bg: 'var(--bg-elevated)',      color: 'var(--text-muted)'  },
  in_progress:  { label: 'En curso',   bg: 'var(--accent-dim)',        color: 'var(--accent)'      },
  completed:    { label: 'Completado', bg: 'rgba(34,197,94,0.12)',     color: '#22c55e'            },
}

const SENTIMENT_EMOJI: Record<string, string> = {
  great: '😊', good: '🙂', neutral: '😐', tired: '😴', overwhelmed: '😰',
}

function StatusBadge({ status }: { status: string | null }) {
  const cfg = STATUS_CONFIG[status ?? ''] ?? STATUS_CONFIG.not_started
  return (
    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
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

export default function PeoplePageClient({ employees, teams, progressByUser, teamFilter, accessRequests }: Props) {
  const router = useRouter()
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [invitePrefilledEmail, setInvitePrefilledEmail] = useState<string | undefined>()
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [requestsExpanded, setRequestsExpanded] = useState(true)

  function handleInviteSuccess(email: string) {
    router.refresh()
    setSuccessMsg(`Invitación enviada a ${email}`)
    setTimeout(() => setSuccessMsg(null), 5000)
  }

  function openInviteForRequest(email: string) {
    setInvitePrefilledEmail(email)
    setShowInviteModal(true)
  }

  function openInviteBlank() {
    setInvitePrefilledEmail(undefined)
    setShowInviteModal(true)
  }

  return (
    <div className="flex flex-col gap-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Personas</h1>
          <span
            className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            {employees.length}
          </span>
        </div>
        <button
          onClick={openInviteBlank}
          className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <UserPlus size={15} />
          Invitar empleado
        </button>
      </div>

      {/* Success banner */}
      {successMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-medium"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#15803d', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          {successMsg}
        </div>
      )}

      {/* Access requests */}
      {accessRequests.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid rgba(251,191,36,0.3)' }}
        >
          <button
            onClick={() => setRequestsExpanded(prev => !prev)}
            className="cursor-pointer w-full flex items-center gap-3 px-4 py-3"
            style={{ borderBottom: requestsExpanded ? '1px solid var(--border-subtle)' : 'none' }}
          >
            <span
              className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#d97706' }}
            >
              {accessRequests.length}
            </span>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Solicitudes de acceso pendientes
            </span>
            <span className="ml-auto" style={{ color: 'var(--text-muted)' }}>
              {requestsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {requestsExpanded && (
            <div className="flex flex-col">
              {accessRequests.map((req, i) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 px-4 py-3"
                  style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      {req.email}
                    </p>
                    {req.message && (
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>
                        {req.message}
                      </p>
                    )}
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {formatRelativeDate(req.created_at)}
                    </p>
                  </div>
                  <button
                    onClick={() => openInviteForRequest(req.email)}
                    className="cursor-pointer flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity flex-shrink-0"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    <UserPlus size={12} />
                    Invitar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Team filter */}
      {teams.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/people"
            className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
            style={!teamFilter
              ? { background: 'var(--accent)', color: '#fff' }
              : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
          >
            Todos
          </Link>
          {teams.map(team => (
            <Link
              key={team.id}
              href={`/admin/people?team=${team.id}`}
              className="text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
              style={teamFilter === team.id
                ? { background: 'var(--accent)', color: '#fff' }
                : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
            >
              {team.name}
            </Link>
          ))}
        </div>
      )}

      {/* Table or empty state */}
      {employees.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
          <Users size={36} style={{ opacity: 0.3 }} />
          <p className="text-sm">
            {teamFilter ? 'No hay empleados en este equipo.' : 'No hay empleados registrados.'}
          </p>
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
                          <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{emp.full_name}</p>
                          {emp.job_title && (
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{emp.job_title}</p>
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
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
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

      {showInviteModal && (
        <InviteModal
          teams={teams}
          initialEmail={invitePrefilledEmail}
          onClose={() => { setShowInviteModal(false); setInvitePrefilledEmail(undefined) }}
          onSuccess={handleInviteSuccess}
        />
      )}
    </div>
  )
}
