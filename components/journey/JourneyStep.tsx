'use client'

import { useState } from 'react'
import {
  CheckSquare, BookOpen, PlayCircle, Users, Brain, Key,
  CheckCircle2, Circle, CircleDashed, Clock, ChevronDown, ChevronRight,
} from 'lucide-react'
import StepDetail from './StepDetail'

export interface StepData {
  progressId: string
  status: 'pending' | 'completed' | 'in_progress'
  id: string
  title: string
  description: string | null
  type: string
  dayNumber: number
  estimatedMinutes: number | null
  content: unknown
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  task:           <CheckSquare size={15} />,
  reading:        <BookOpen size={15} />,
  video:          <PlayCircle size={15} />,
  meeting:        <Users size={15} />,
  assessment:     <Brain size={15} />,
  access_request: <Key size={15} />,
}

interface Props {
  step: StepData
  isActionable: boolean
  boundCompleteAction: (() => Promise<void>) | null
}

export default function JourneyStep({ step, isActionable, boundCompleteAction }: Props) {
  const [expanded, setExpanded] = useState(false)
  const isCompleted = step.status === 'completed'

  return (
    <div id={`step-${step.id}`}>
      <div
        className="flex items-center gap-3 py-2.5"
        style={{
          borderTop: '1px solid var(--border-subtle)',
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span
          style={{
            flexShrink: 0,
            color: isCompleted ? '#22c55e' : isActionable ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          {isCompleted
            ? <CheckCircle2 size={17} />
            : isActionable
              ? <CircleDashed size={17} />
              : <Circle size={17} />}
        </span>

        <span style={{ flexShrink: 0, color: 'var(--text-muted)' }}>
          {TYPE_ICONS[step.type] ?? <CheckSquare size={15} />}
        </span>

        <div className="flex-1 min-w-0">
          <p
            className="text-sm font-medium"
            style={{
              color: 'var(--text-primary)',
              opacity: isCompleted ? 0.55 : 1,
              textDecoration: isCompleted ? 'line-through' : undefined,
            }}
          >
            {step.title}
          </p>
          {step.estimatedMinutes != null && (
            <span className="flex items-center gap-1 text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              <Clock size={11} /> {step.estimatedMinutes} min
            </span>
          )}
        </div>

        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </div>

      {expanded && (
        <StepDetail
          progressId={step.progressId}
          stepId={step.id}
          stepTitle={step.title}
          stepType={step.type}
          stepDescription={step.description}
          stepContent={step.content}
          onComplete={boundCompleteAction}
        />
      )}
    </div>
  )
}
