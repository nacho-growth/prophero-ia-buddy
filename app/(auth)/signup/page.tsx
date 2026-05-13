'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Mail, MessageSquare, CheckCircle2, Loader2 } from 'lucide-react'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, message: message || undefined }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al enviar la solicitud')
        return
      }
      setSent(true)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    backgroundColor: 'var(--bg-elevated)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  }

  if (sent) {
    return (
      <div className="w-full max-w-sm">
        <div
          className="rounded-2xl p-8 shadow-xl text-center flex flex-col items-center gap-4"
          style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          <CheckCircle2 size={44} style={{ color: '#22c55e' }} />
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              ¡Solicitud enviada!
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Nos ponemos en contacto a la brevedad en{' '}
              <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{email}</span>.
            </p>
          </div>
          <Link
            href="/login"
            className="text-sm font-medium"
            style={{ color: 'var(--accent)' }}
          >
            Volver al login
          </Link>
        </div>
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
          Acceso solo por invitación
        </h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
          PropHero IA Buddy es una plataforma privada. Dejá tu email y un admin te contactará.
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
                onChange={e => setEmail(e.target.value)}
                placeholder="tu@email.com"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="message" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
              ¿Por qué querés acceder?{' '}
              <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              <textarea
                id="message"
                value={message}
                onChange={e => setMessage(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Contanos un poco sobre vos…"
                className="w-full rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>
            {message.length > 400 && (
              <p className="text-xs text-right" style={{ color: 'var(--text-muted)' }}>
                {message.length}/500
              </p>
            )}
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
            disabled={loading || !email}
            className="cursor-pointer flex items-center justify-center gap-2 w-full font-semibold rounded-lg py-2.5 text-sm transition-opacity mt-1 disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {loading ? 'Enviando…' : 'Solicitar acceso'}
          </button>
        </form>
      </div>

      <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
        ¿Ya tenés invitación?{' '}
        <Link href="/login" className="font-medium" style={{ color: 'var(--accent)' }}>
          Iniciá sesión
        </Link>
      </p>
    </div>
  )
}
