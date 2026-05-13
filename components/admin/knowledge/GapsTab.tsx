import { Sparkles } from 'lucide-react'

interface Gap {
  id: string
  question: string
  frequency: number | null
  status: string | null
  created_at: string
  team_id: string | null
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  open:        { label: 'Abierto',     bg: '#fef2f2',               color: '#ef4444' },
  in_progress: { label: 'En revisión', bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  resolved:    { label: 'Resuelto',    bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function GapsTab({ gaps }: { gaps: Gap[] }) {
  if (gaps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
        <Sparkles size={36} style={{ opacity: 0.3 }} />
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          No hay gaps detectados
        </p>
        <p className="text-sm">¡Buddy puede responder todo!</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {gaps.length} gap{gaps.length !== 1 ? 's' : ''} detectado{gaps.length !== 1 ? 's' : ''}
      </p>
      <div className="flex flex-col gap-2">
        {gaps.map((gap, i) => {
          const statusCfg = STATUS_CONFIG[gap.status ?? ''] ?? STATUS_CONFIG.open
          const isLong = gap.question.length > 100
          return (
            <div
              key={gap.id}
              className="rounded-xl px-4 py-3 flex flex-col gap-2"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-3">
                <p
                  className="text-sm leading-relaxed flex-1"
                  style={{ color: 'var(--text-primary)' }}
                  title={isLong ? gap.question : undefined}
                >
                  {isLong ? gap.question.slice(0, 100) + '…' : gap.question}
                </p>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0"
                  style={{ background: statusCfg.bg, color: statusCfg.color }}
                >
                  {statusCfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                {gap.frequency != null && gap.frequency > 0 && (
                  <span
                    className="font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    Preguntado {gap.frequency} {gap.frequency === 1 ? 'vez' : 'veces'}
                  </span>
                )}
                <span>{formatDate(gap.created_at)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
