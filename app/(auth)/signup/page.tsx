'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'IA Buddy'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8 shadow-xl text-center"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <div
            className="flex items-center justify-center w-12 h-12 rounded-full mx-auto mb-4"
            style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(45,91,227,0.3)' }}
          >
            <Mail className="w-6 h-6" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Revisa tu email
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Enviamos un enlace de confirmación a{' '}
            <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{email}</span>.
            Haz clic para activar tu cuenta.
          </p>
        </div>
        <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
          ¿Ya confirmaste?{' '}
          <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
            Inicia sesión
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm">
      <div
        className="rounded-2xl p-8 shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Crear cuenta
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Comienza con {agentName}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="fullName" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Nombre completo
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Juan García"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              Contraseña
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                }}
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
            className="flex items-center justify-center gap-2 w-full font-semibold rounded-lg py-2.5 text-sm transition-opacity mt-1 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Inicia sesión
        </Link>
      </p>
    </div>
  )
}
