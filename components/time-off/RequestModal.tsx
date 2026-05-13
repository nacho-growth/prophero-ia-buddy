'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, Calendar, AlertCircle } from 'lucide-react'

interface TimeOffType { id: string; name: string; color: string | null }
interface Balance { days_total: number; days_used: number; days_pending: number }

interface Props {
  types: TimeOffType[]
  balance: Balance | null
  onSuccess: () => void
  onClose: () => void
}

function calculateWorkingDays(start: string, end: string): number {
  if (!start || !end) return 0
  let count = 0
  const current = new Date(start + 'T12:00:00')
  const endDate = new Date(end + 'T12:00:00')
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export default function RequestModal({ types, balance, onSuccess, onClose }: Props) {
  const [typeId, setTypeId] = useState(types[0]?.id ?? '')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const workingDays = calculateWorkingDays(startDate, endDate)
  const available = balance ? balance.days_total - balance.days_used - balance.days_pending : null
  const afterRequest = available !== null ? available - workingDays : null
  const exceedsBalance = available !== null && workingDays > 0 && workingDays > available

  async function handleSubmit() {
    if (!typeId || !startDate || !endDate || workingDays === 0) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/time-off/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ typeId, startDate, endDate, reason: reason || undefined }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) { setError(data.error ?? 'Error al enviar solicitud'); return }
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  }
  const today = new Date().toISOString().split('T')[0]

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={e => e.stopPropagation()}>
        <div
          className="w-full max-w-md rounded-2xl flex flex-col overflow-hidden"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <Calendar size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Nueva solicitud</h2>
            </div>
            <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {/* Form */}
          <div className="flex flex-col gap-4 px-6 py-5">
            {error && (
              <div
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                style={{ background: '#fef2f2', color: '#dc2626' }}
              >
                <AlertCircle size={15} />{error}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tipo *</label>
              <select
                value={typeId}
                onChange={e => setTypeId(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                style={inputStyle}
              >
                {types.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Desde *</label>
                <input
                  type="date"
                  value={startDate}
                  min={today}
                  onChange={e => setStartDate(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Hasta *</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate || today}
                  onChange={e => setEndDate(e.target.value)}
                  className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {workingDays > 0 && (
              <div
                className="rounded-lg px-3 py-2.5 flex flex-col gap-1"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {workingDays} días hábiles
                </p>
                {afterRequest !== null && (
                  <p className="text-xs" style={{ color: exceedsBalance ? '#ef4444' : 'var(--text-muted)' }}>
                    {exceedsBalance
                      ? `⚠ Excede tu saldo disponible (${available} días)`
                      : `Te quedarían ${afterRequest} días disponibles`}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Motivo (opcional)</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="Vacaciones familiares, cita médica..."
                rows={3}
                className="rounded-lg px-3 py-2 text-sm focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-6 py-4"
            style={{ borderTop: '1px solid var(--border-subtle)' }}
          >
            <button
              onClick={onClose}
              className="cursor-pointer text-sm px-4 py-2 rounded-xl"
              style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={!typeId || !startDate || !endDate || workingDays === 0 || exceedsBalance || loading}
              className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40 hover:opacity-80 transition-opacity"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {loading
                ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                : <><Calendar size={14} /> Solicitar</>}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
