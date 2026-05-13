import { ArrowRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Step {
  id: string
  title: string
  description: string | null
  step_order: number
}

interface Props {
  step: Step | null
}

export default function HomeNextStepCard({ step }: Props) {
  if (!step) {
    return (
      <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={18} style={{ color: '#22c55e' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Próximo paso</span>
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>¡Sin pasos pendientes! Sigue explorando.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2">
        <ArrowRight size={18} style={{ color: 'var(--accent)' }} />
        <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Próximo paso</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>Paso {step.step_order}</span>
      </div>
      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{step.title}</p>
      {step.description && (
        <p className="text-sm line-clamp-2" style={{ color: 'var(--text-muted)' }}>{step.description}</p>
      )}
      <Link
        href="/app/journey"
        className="text-sm font-medium flex items-center gap-1 mt-auto pt-1"
        style={{ color: 'var(--accent)' }}
      >
        Ir al paso <ArrowRight size={14} />
      </Link>
    </div>
  )
}
