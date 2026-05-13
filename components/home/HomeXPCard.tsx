import { Zap } from 'lucide-react'

const LEVEL_THRESHOLDS: Record<string, number> = {
  junior: 0,
  mid:    500,
  senior: 1500,
}

interface Props {
  xpTotal: number
  currentLevel: string
}

export default function HomeXPCard({ xpTotal, currentLevel }: Props) {
  const levels = Object.keys(LEVEL_THRESHOLDS)
  const idx = levels.indexOf(currentLevel)
  const currentFloor = LEVEL_THRESHOLDS[currentLevel] ?? 0
  const nextCeiling = idx >= 0 && idx < levels.length - 1 ? LEVEL_THRESHOLDS[levels[idx + 1]] : null
  const pct = nextCeiling != null && nextCeiling > currentFloor
    ? Math.min(100, Math.round(((xpTotal - currentFloor) / (nextCeiling - currentFloor)) * 100))
    : 100

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap size={18} style={{ color: '#f59e0b' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>XP &amp; Nivel</span>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          {currentLevel}
        </span>
      </div>
      <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
        {xpTotal.toLocaleString('es')}
        <span className="text-base font-normal ml-1" style={{ color: 'var(--text-muted)' }}>XP</span>
      </p>
      <div className="flex flex-col gap-1">
        <div className="rounded-full h-1.5" style={{ background: 'var(--bg-elevated)' }}>
          <div className="rounded-full h-1.5 transition-all" style={{ width: `${pct}%`, background: '#f59e0b' }} />
        </div>
        {nextCeiling != null && nextCeiling > xpTotal && (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {nextCeiling - xpTotal} XP para el siguiente nivel
          </span>
        )}
      </div>
    </div>
  )
}
