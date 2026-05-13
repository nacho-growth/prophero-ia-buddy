'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Lock, Loader2, CheckCircle2 } from 'lucide-react'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres')
      return
    }
    setLoading(true)
    setError(null)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }
    setDone(true)
    setTimeout(() => router.replace('/app/home'), 2000)
  }

  if (done) {
    return (
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#22c55e' }} />
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            ¡Contraseña creada!
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Redirigiendo a tu cuenta...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div
        className="rounded-2xl p-8"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Crear contraseña
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Elegí una contraseña segura para tu cuenta.
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Nueva contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Confirmar contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                type="password"
                required
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          {error && (
            <p
              className="text-sm rounded-lg px-3 py-2"
              style={{ color: '#f87171', backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
            >
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="cursor-pointer flex items-center justify-center gap-2 w-full font-semibold rounded-lg py-2.5 text-sm disabled:opacity-60 hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Guardando...' : 'Crear contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}
