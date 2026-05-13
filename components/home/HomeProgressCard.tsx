import { TrendingUp } from 'lucide-react'

interface Props {
  onboardingDay: number
  completedSteps: number
  totalSteps: number
  todayXP: number
}

export default function HomeProgressCard({ onboardingDay, completedSteps, totalSteps, todayXP }: Props) {
  const pct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0

  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <TrendingUp size={18} style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Progreso</span>
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>Día {onboardingDay} · {completedSteps}/{totalSteps} pasos</span>
          <span>{pct}%</span>
        </div>
        <div className="rounded-full h-2" style={{ background: 'var(--bg-elevated)' }}>
          <div className="rounded-full h-2 transition-all" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
        </div>
      </div>
      {todayXP > 0 && (
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>+{todayXP} XP ganados hoy</p>
      )}
    </div>
  )
}
