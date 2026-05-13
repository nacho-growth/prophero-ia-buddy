'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'

interface Answer {
  question: string
  answer: string
  correct: boolean
  ai_feedback: string
}

interface Assessment {
  id: string
  score: number | null
  passed: boolean | null
  xp_earned: number | null
  completed_at: string | null
  ai_overall_feedback: string | null
  answers: unknown
  assessments: { title: string } | null
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function AssessmentCard({ assessments }: { assessments: Assessment[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (assessments.length === 0) {
    return (
      <div
        className="rounded-xl p-5 flex flex-col gap-3"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Assessments</h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin evaluaciones completadas.</p>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Assessments
          <span
            className="ml-2 text-xs font-normal px-1.5 py-0.5 rounded-full"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
          >
            {assessments.length}
          </span>
        </h2>
      </div>

      <div className="flex flex-col divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
        {assessments.map(a => {
          const isOpen = expanded === a.id
          const title = a.assessments?.title ?? 'Assessment'
          const score = a.score ?? 0
          const passed = a.passed ?? false
          const answers = (a.answers as Answer[] | null) ?? []

          return (
            <div key={a.id}>
              <button
                type="button"
                onClick={() => setExpanded(isOpen ? null : a.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:opacity-80 transition-opacity"
              >
                <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {title}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(a.completed_at)}
                    {a.xp_earned ? ` · +${a.xp_earned} XP` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="text-sm font-bold"
                    style={{ color: score >= 70 ? '#22c55e' : '#ef4444' }}
                  >
                    {score}%
                  </span>
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={passed
                      ? { background: '#14532d33', color: '#22c55e' }
                      : { background: '#fef2f2', color: '#ef4444' }}
                  >
                    {passed ? 'Aprobado' : 'No aprobado'}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div
                  className="px-5 pb-4 flex flex-col gap-3"
                  style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}
                >
                  {a.ai_overall_feedback && (
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {a.ai_overall_feedback}
                    </p>
                  )}

                  {answers.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {answers.map((ans, i) => (
                        <div
                          key={i}
                          className="rounded-lg p-3 flex flex-col gap-1"
                          style={{
                            background: ans.correct ? '#f0fdf4' : '#fef2f2',
                            border: `1px solid ${ans.correct ? '#bbf7d0' : '#fecaca'}`,
                          }}
                        >
                          <div className="flex items-start gap-2">
                            <span className="shrink-0 mt-0.5">
                              {ans.correct
                                ? <CheckCircle2 size={13} style={{ color: '#22c55e' }} />
                                : <XCircle size={13} style={{ color: '#ef4444' }} />}
                            </span>
                            <p className="text-xs font-medium" style={{ color: '#1a1a1a' }}>
                              {ans.question}
                            </p>
                          </div>
                          <p className="text-xs pl-5" style={{ color: '#555' }}>
                            Respuesta: <em>{ans.answer}</em>
                          </p>
                          {ans.ai_feedback && (
                            <p className="text-xs pl-5" style={{ color: ans.correct ? '#166534' : '#991b1b' }}>
                              {ans.ai_feedback}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
