'use client'

import { useState, useEffect } from 'react'
import { X, Loader2, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'

interface Team { id: string; name: string }

interface Props {
  teams: Team[]
  onClose: () => void
  onSuccess: (email: string) => void
  initialEmail?: string
}

export default function InviteModal({ teams, onClose, onSuccess, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail ?? '')
  const [fullName, setFullName] = useState('')
  const [teamId, setTeamId] = useState(teams[0]?.id ?? '')
  const [role, setRole] = useState('employee')
  const [jobTitle, setJobTitle] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  async function handleSubmit() {
    if (!email || !fullName || !teamId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, fullName, teamId, role, jobTitle: jobTitle || undefined, requestEmail: initialEmail || undefined }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al invitar')
        return
      }
      setSent(true)
      setTimeout(() => {
        onSuccess(email)
        onClose()
      }, 1800)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={e => e.stopPropagation()}
      >
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
              <UserPlus size={18} style={{ color: 'var(--accent)' }} />
              <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Invitar empleado
              </h2>
            </div>
            <button onClick={onClose} className="cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              <X size={18} />
            </button>
          </div>

          {sent ? (
            /* Success state */
            <div className="flex flex-col items-center gap-3 px-6 py-10">
              <CheckCircle2 size={40} style={{ color: '#22c55e' }} />
              <p className="font-semibold text-center" style={{ color: 'var(--text-primary)' }}>
                ¡Invitación enviada!
              </p>
              <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>
                Le enviamos un email a <strong>{email}</strong> con el acceso.
              </p>
            </div>
          ) : (
            <>
              {/* Form */}
              <div className="flex flex-col gap-4 px-6 py-5">
                {error && (
                  <div
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                    style={{ background: '#fef2f2', color: '#dc2626' }}
                  >
                    <AlertCircle size={15} />
                    {error}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Email *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nombre@prophero.com"
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nombre completo *</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Juan García"
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Equipo *</label>
                  <select
                    value={teamId}
                    onChange={e => setTeamId(e.target.value)}
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={inputStyle}
                  >
                    {teams.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Rol *</label>
                  <select
                    value={role}
                    onChange={e => setRole(e.target.value)}
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none cursor-pointer"
                    style={inputStyle}
                  >
                    <option value="employee">Empleado</option>
                    <option value="manager">Manager</option>
                    <option value="hr_admin">HR Admin</option>
                    <option value="tenant_admin">Tenant Admin</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Cargo (opcional)</label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={e => setJobTitle(e.target.value)}
                    placeholder="Investor Relations Specialist"
                    className="rounded-lg px-3 py-2 text-sm focus:outline-none"
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
                  disabled={!email || !fullName || !teamId || loading}
                  className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40 hover:opacity-80 transition-opacity"
                  style={{ background: 'var(--accent)', color: '#fff' }}
                >
                  {loading
                    ? <><Loader2 size={14} className="animate-spin" /> Enviando...</>
                    : <><UserPlus size={14} /> Enviar invitación</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
