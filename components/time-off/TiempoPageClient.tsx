'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Umbrella, Calendar, Plus } from 'lucide-react'
import RequestModal from './RequestModal'

export interface TimeOffType {
  id: string
  name: string
  color: string | null
  deducts_balance: boolean
}

export interface Balance {
  days_total: number
  days_used: number
  days_pending: number
  time_off_policies: { name: string } | null
}

export interface TimeOffRequest {
  id: string
  start_date: string
  end_date: string
  days_count: number
  status: string
  reason: string | null
  review_comment: string | null
  created_at: string
  time_off_types: { name: string; color: string | null } | null
}

export interface PublicHoliday {
  id: string
  date: string
  name: string
  country_code: string
}

interface Props {
  balance: Balance | null
  requests: TimeOffRequest[]
  holidays: PublicHoliday[]
  types: TimeOffType[]
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

function formatHolidayDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })
}

export default function TiempoPageClient({ balance, requests, holidays, types }: Props) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)

  const available = balance
    ? balance.days_total - balance.days_used - balance.days_pending
    : 0
  const pct = balance && balance.days_total > 0
    ? Math.round((balance.days_used / balance.days_total) * 100)
    : 0

  function handleSuccess() {
    setShowModal(false)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Tiempo libre</h1>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <Plus size={15} />
          Nueva solicitud
        </button>
      </div>

      {/* Grid 2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Balance card */}
        <div
          className="rounded-xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Umbrella size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>
              Mi saldo {new Date().getFullYear()}
            </h2>
          </div>
          {balance ? (
            <>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>{available}</span>
                <span className="text-sm mb-1" style={{ color: 'var(--text-muted)' }}>días disponibles</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-elevated)' }}>
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: 'var(--accent)' }}
                />
              </div>
              <div className="flex gap-6">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Usados</span>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{balance.days_used}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pendientes</span>
                  <span className="text-sm font-semibold" style={{ color: '#d97706' }}>{balance.days_pending}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Disponibles</span>
                  <span className="text-sm font-semibold" style={{ color: '#22c55e' }}>{available}</span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Tu saldo aún no fue configurado. Contactá a tu manager.
            </p>
          )}
        </div>

        {/* Holidays card */}
        <div
          className="rounded-xl p-5 flex flex-col gap-3"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Calendar size={16} style={{ color: 'var(--accent)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text-muted)' }}>Próximos feriados</h2>
          </div>
          {holidays.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center gap-3">
                  <span
                    className="text-xs font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                  >
                    {COUNTRY_FLAG[h.country_code] ?? ''} {h.country_code}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{h.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--text-muted)' }}>{formatHolidayDate(h.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay feriados próximos</p>
          )}
        </div>
      </div>

      {/* Requests */}
      <div className="flex flex-col gap-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Mis solicitudes</h2>
        {requests.length === 0 ? (
          <div
            className="rounded-xl flex flex-col items-center gap-2 py-12"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            <Calendar size={28} style={{ opacity: 0.3 }} />
            <p className="text-sm">No tenés solicitudes registradas</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Tipo', 'Fechas', 'Días', 'Estado', 'Solicitado'].map(h => (
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
                {requests.map((req, i) => {
                  const st = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending
                  const tt = req.time_off_types
                  return (
                    <tr key={req.id} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          {tt?.color && (
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tt.color }} />
                          )}
                          <span style={{ color: 'var(--text-primary)' }}>{tt?.name ?? '—'}</span>
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
                        {formatDate(req.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <RequestModal
          types={types}
          balance={balance}
          onSuccess={handleSuccess}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  )
}
