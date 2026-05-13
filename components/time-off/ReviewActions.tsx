'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'

interface Props {
  requestId: string
}

export default function ReviewActions({ requestId }: Props) {
  const router = useRouter()
  const [state, setState] = useState<'idle' | 'confirming_reject' | 'loading'>('idle')
  const [comment, setComment] = useState('')
  const [error, setError] = useState<string | null>(null)

  async function doAction(action: 'approve' | 'reject') {
    setState('loading')
    setError(null)
    try {
      const res = await fetch('/api/time-off/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action, comment: comment || undefined }),
      })
      const data = await res.json() as { error?: string }
      if (!res.ok) {
        setError(data.error ?? 'Error al procesar')
        setState('idle')
        return
      }
      router.refresh()
    } catch {
      setError('Error de red')
      setState('idle')
    }
  }

  if (state === 'confirming_reject') {
    return (
      <div className="flex flex-col gap-2">
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Motivo del rechazo (opcional)"
          rows={2}
          className="rounded-lg px-3 py-2 text-xs focus:outline-none resize-none w-full"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => doAction('reject')}
            className="cursor-pointer flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <XCircle size={12} /> Confirmar rechazo
          </button>
          <button
            onClick={() => setState('idle')}
            className="cursor-pointer text-xs px-3 py-1.5 rounded-lg"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            Cancelar
          </button>
        </div>
        {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {state === 'loading' ? (
        <Loader2 size={16} className="animate-spin" style={{ color: 'var(--text-muted)' }} />
      ) : (
        <>
          <button
            onClick={() => doAction('approve')}
            className="cursor-pointer flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
          >
            <CheckCircle2 size={12} /> Aprobar
          </button>
          <button
            onClick={() => setState('confirming_reject')}
            className="cursor-pointer flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
            style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <XCircle size={12} /> Rechazar
          </button>
        </>
      )}
      {error && <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>}
    </div>
  )
}
