'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Calendar, Clock, CheckCircle2, XCircle, Plus, Globe } from 'lucide-react'
import ReviewActions from './ReviewActions'

interface PendingRequest {
  id: string
  start_date: string
  end_date: string
  days_count: number
  reason: string | null
  created_at: string
  users: { full_name: string; email: string; teams: { name: string } | null } | null
  time_off_types: { name: string; color: string | null } | null
}

interface HistoryRequest {
  id: string
  start_date: string
  end_date: string
  days_count: number
  status: string
  review_comment: string | null
  reviewed_at: string | null
  created_at: string
  users: { full_name: string } | null
  time_off_types: { name: string; color: string | null } | null
}

interface Holiday {
  id: string
  date: string
  name: string
  country_code: string
}

interface Policy {
  id: string
  name: string
  days_per_year: number
  carry_over_days: number
  notice_days_required: number | null
  is_default: boolean
}

interface TimeOffType {
  id: string
  name: string
  color: string | null
  is_active: boolean
  deducts_balance: boolean
}

interface Props {
  tab: string
  pending: PendingRequest[]
  history: HistoryRequest[]
  holidays: Holiday[]
  policies: Policy[]
  types: TimeOffType[]
  tenantId: string
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Pendiente',  bg: 'rgba(251,191,36,0.15)',  color: '#d97706' },
  approved:  { label: 'Aprobado',   bg: 'rgba(34,197,94,0.12)',   color: '#22c55e' },
  rejected:  { label: 'Rechazado',  bg: 'rgba(239,68,68,0.12)',   color: '#ef4444' },
  cancelled: { label: 'Cancelado',  bg: 'var(--bg-elevated)',     color: 'var(--text-muted)' },
}

const COUNTRY_FLAG: Record<string, string> = {
  ES: '🇪🇸', AR: '🇦🇷', FR: '🇫🇷', IE: '🇮🇪', ID: '🇮🇩', US: '🇺🇸', MX: '🇲🇽', CO: '🇨🇴',
}

function formatDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function formatDateLong(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const TABS = [
  { key: 'pending',  label: 'Pendientes', icon: Clock },
  { key: 'history',  label: 'Historial',  icon: CheckCircle2 },
  { key: 'holidays', label: 'Feriados',   icon: Globe },
  { key: 'policies', label: 'Políticas',  icon: Calendar },
]

export default function AdminTimeOffClient({ tab, pending, history, holidays, policies, types, tenantId }: Props) {
  const [historyFilter, setHistoryFilter] = useState<string>('all')

  const filteredHistory = historyFilter === 'all'
    ? history
    : history.filter(r => r.status === historyFilter)

  // Group holidays by country
  const holidaysByCountry = holidays.reduce<Record<string, Holiday[]>>((acc, h) => {
    if (!acc[h.country_code]) acc[h.country_code] = []
    acc[h.country_code].push(h)
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Time Off</h1>
          {tab === 'pending' && pending.length > 0 && (
            <span
              className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'rgba(251,191,36,0.2)', color: '#d97706' }}
            >
              {pending.length}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: 0 }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={key === 'pending' ? '/admin/time-off' : `/admin/time-off?tab=${key}`}
            className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors"
            style={{
              color: tab === key ? 'var(--accent)' : 'var(--text-muted)',
              borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            <Icon size={14} />
            {label}
          </Link>
        ))}
      </div>

      {/* Tab: Pending */}
      {tab === 'pending' && (
        pending.length === 0 ? (
          <div
            className="rounded-xl flex flex-col items-center gap-2 py-16"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <CheckCircle2 size={32} style={{ opacity: 0.3 }} />
            <p className="text-sm">No hay solicitudes pendientes</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {pending.map(req => (
              <div
                key={req.id}
                className="rounded-xl p-5 flex flex-col gap-4"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                        {req.users?.full_name ?? req.users?.email ?? '—'}
                      </span>
                      {req.users?.teams?.name && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                        >
                          {req.users.teams.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {req.time_off_types?.color && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: req.time_off_types.color }} />
                      )}
                      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {req.time_off_types?.name ?? '—'}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>·</span>
                      <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                        {formatDate(req.start_date)} → {formatDate(req.end_date)}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        ({req.days_count} días)
                      </span>
                    </div>
                    {req.reason && (
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{req.reason}</p>
                    )}
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Solicitado {formatDate(req.created_at)}
                    </p>
                  </div>
                </div>
                <ReviewActions requestId={req.id} />
              </div>
            ))}
          </div>
        )
      )}

      {/* Tab: History */}
      {tab === 'history' && (
        <div className="flex flex-col gap-4">
          {/* Filter */}
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'Todos' },
              { key: 'approved', label: 'Aprobados' },
              { key: 'rejected', label: 'Rechazados' },
              { key: 'pending', label: 'Pendientes' },
              { key: 'cancelled', label: 'Cancelados' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setHistoryFilter(f.key)}
                className="cursor-pointer text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                style={historyFilter === f.key
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filteredHistory.length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center gap-2 py-12"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Calendar size={28} style={{ opacity: 0.3 }} />
              <p className="text-sm">Sin registros</p>
            </div>
          ) : (
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    {['Empleado', 'Tipo', 'Fechas', 'Días', 'Estado', 'Revisado'].map(h => (
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
                  {filteredHistory.map((req, i) => {
                    const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
                    return (
                      <tr key={req.id} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}>
                        <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {req.users?.full_name ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5">
                            {req.time_off_types?.color && (
                              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: req.time_off_types.color }} />
                            )}
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {req.time_off_types?.name ?? '—'}
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
                          {formatDate(req.start_date)} → {formatDate(req.end_date)}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {req.days_count}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-medium px-2 py-0.5 rounded-full"
                            style={{ background: st.bg, color: st.color }}
                          >
                            {st.label}
                          </span>
                          {req.status === 'rejected' && req.review_comment && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{req.review_comment}</p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                          {req.reviewed_at ? formatDate(req.reviewed_at) : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Holidays */}
      {tab === 'holidays' && (
        <div className="flex flex-col gap-6">
          {Object.keys(holidaysByCountry).length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center gap-2 py-12"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Globe size={28} style={{ opacity: 0.3 }} />
              <p className="text-sm">No hay feriados configurados</p>
            </div>
          ) : (
            Object.entries(holidaysByCountry).sort(([a], [b]) => a.localeCompare(b)).map(([code, hs]) => (
              <div key={code} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base">{COUNTRY_FLAG[code] ?? ''}</span>
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    {code}
                  </span>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {hs.length} feriados
                  </span>
                </div>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        {['Fecha', 'Nombre'].map(h => (
                          <th
                            key={h}
                            className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wide"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {hs.map((h, i) => (
                        <tr key={h.id} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}>
                          <td className="px-4 py-2.5 text-xs whitespace-nowrap capitalize" style={{ color: 'var(--text-secondary)' }}>
                            {formatDateLong(h.date)}
                          </td>
                          <td className="px-4 py-2.5 text-sm" style={{ color: 'var(--text-primary)' }}>
                            {h.name}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Policies */}
      {tab === 'policies' && (
        <div className="flex flex-col gap-4">
          {policies.length === 0 ? (
            <div
              className="rounded-xl flex flex-col items-center gap-2 py-12"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <Calendar size={28} style={{ opacity: 0.3 }} />
              <p className="text-sm">No hay políticas configuradas</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {policies.map(p => (
                <div
                  key={p.id}
                  className="rounded-xl p-5 flex flex-col gap-3"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{p.name}</h3>
                    {p.is_default && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                      >
                        Por defecto
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Días/año</span>
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{p.days_per_year}</span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Carry over</span>
                      <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{p.carry_over_days}</span>
                    </div>
                    {p.notice_days_required !== null && (
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Aviso previo</span>
                        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{p.notice_days_required}d</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Types section */}
          {types.length > 0 && (
            <div className="flex flex-col gap-3 mt-2">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Tipos de ausencia</h2>
              <div className="flex flex-wrap gap-2">
                {types.map(t => (
                  <span
                    key={t.id}
                    className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    {t.color && <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />}
                    {t.name}
                    {!t.is_active && <span style={{ color: 'var(--text-muted)' }}>(inactivo)</span>}
                    {!t.deducts_balance && <span style={{ color: 'var(--text-muted)' }}>· sin descuento</span>}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
