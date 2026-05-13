import { Heart } from 'lucide-react'

const SENTIMENTS: Record<string, { label: string; color: string; emoji: string }> = {
  great:   { label: 'Excelente', color: '#22c55e', emoji: '😄' },
  good:    { label: 'Bien',      color: '#84cc16', emoji: '🙂' },
  neutral: { label: 'Neutral',   color: '#f59e0b', emoji: '😐' },
  bad:     { label: 'Regular',   color: '#f97316', emoji: '😕' },
  terrible:{ label: 'Difícil',   color: '#ef4444', emoji: '😞' },
}

interface Props {
  lastSentiment: string | null
}

export default function HomeCheckinCard({ lastSentiment }: Props) {
  const sentiment = lastSentiment ? (SENTIMENTS[lastSentiment] ?? null) : null

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <Heart size={18} style={{ color: '#ec4899' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Último check-in</span>
      </div>
      {sentiment ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl">{sentiment.emoji}</span>
          <div>
            <p className="font-semibold" style={{ color: sentiment.color }}>{sentiment.label}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Tu estado de ánimo reciente</p>
          </div>
        </div>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin check-in registrado aún</p>
      )}
    </div>
  )
}
