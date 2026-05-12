'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'IA Buddy'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    window.location.href = '/api/auth/callback?next=/app/home'
  }

  return (
    <div className="w-full max-w-sm">
      <div
        className="rounded-2xl p-8 shadow-xl"
        style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          Bienvenido
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          Inicia sesión en {agentName}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  // @ts-ignore
                  '--tw-ring-color': 'var(--accent)',
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2"
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
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        ¿No tienes cuenta?{' '}
        <Link href="/signup" className="font-medium" style={{ color: 'var(--accent)' }}>
          Regístrate
        </Link>
      </p>
    </div>
  )
}
