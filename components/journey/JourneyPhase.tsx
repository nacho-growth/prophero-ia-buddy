'use client'

import { useState } from 'react'
import { Lock, ChevronDown, ChevronRight } from 'lucide-react'
import JourneyStep, { type StepData } from './JourneyStep'

export interface PhaseData {
  number: number
  name: string
  steps: StepData[]
  status: 'completed' | 'in_progress' | 'locked'
  completedCount: number
}

interface Props {
  phase: PhaseData
  boundCompleteAction: (() => Promise<void>) | null
}

const STATUS_COLOR: Record<PhaseData['status'], string> = {
  completed:   '#22c55e',
  in_progress: 'var(--accent)',
  locked:      'var(--text-muted)',
}

const STATUS_LABEL: Record<PhaseData['status'], string> = {
  completed:   'Completada',
  in_progress: 'En progreso',
  locked:      'Bloqueada',
}

export default function JourneyPhase({ phase, boundCompleteAction }: Props) {
  const [isOpen, setIsOpen] = useState(phase.status === 'in_progress')
  const isLocked = phase.status === 'locked'
  const color = STATUS_COLOR[phase.status]
  const pct = phase.steps.length > 0
    ? Math.round((phase.completedCount / phase.steps.length) * 100)
    : 0

  const actionableStep = phase.steps.find(s => s.status === 'pending')

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        opacity: isLocked ? 0.55 : 1,
      }}
    >
      <button
        onClick={() => !isLocked && setIsOpen(o => !o)}
        disabled={isLocked}
        className="w-full flex items-center gap-3 p-4 text-left"
        style={{ cursor: isLocked ? 'default' : 'pointer' }}
      >
        <span
          className="flex items-center justify-center rounded-full shrink-0 text-xs font-bold"
          style={{ width: 28, height: 28, background: color, color: '#fff' }}
        >
          {isLocked ? <Lock size={13} /> : phase.number}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Fase {phase.number} — {phase.name}
            </span>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
            >
              {STATUS_LABEL[phase.status]}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 rounded-full h-1.5" style={{ background: 'var(--bg-elevated)' }}>
              <div
                className="rounded-full h-1.5 transition-all"
                style={{ width: `${pct}%`, background: color }}
              />
            </div>
            <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
              {phase.completedCount}/{phase.steps.length}
            </span>
          </div>
        </div>

        {!isLocked && (
          <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </span>
        )}
      </button>

      {isOpen && !isLocked && (
        <div className="px-4 pb-4">
          {phase.steps.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin pasos en esta fase</p>
          ) : (
            phase.steps.map(step => {
              const isActionable =
                step.progressId === actionableStep?.progressId && boundCompleteAction !== null
              return (
                <JourneyStep
                  key={step.progressId}
                  step={step}
                  isActionable={isActionable}
                  boundCompleteAction={isActionable ? boundCompleteAction : null}
                />
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
