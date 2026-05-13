'use client'

import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Link from 'next/link'
import {
  MessageCircle, CheckSquare, Loader2, CheckCircle2,
  XCircle, RotateCcw, Trophy, AlertCircle, Clock,
} from 'lucide-react'

// ── Shared types ──────────────────────────────────────────────────────────────

interface StepDetailProps {
  progressId: string
  stepId: string
  stepTitle: string
  stepType: string
  stepDescription: string | null
  stepContent: unknown
  onComplete: (() => Promise<void>) | null
}

interface Question {
  question: string
  type: 'multiple_choice' | 'open_ended'
  options?: string[]
  correctOption?: string
}

interface QuestionResult {
  correct: boolean
  feedback: string
}

interface AssessmentResults {
  results: QuestionResult[]
  score: number
  passed: boolean
  generalFeedback: string
}

type AssessmentState = 'idle' | 'loading_questions' | 'answering' | 'evaluating' | 'results'

// ── Completed badge ───────────────────────────────────────────────────────────

function CompletedBadge() {
  return (
    <span
      className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl"
      style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
    >
      <CheckCircle2 size={14} />
      Completado
    </span>
  )
}

// ── Shared CompleteButton ─────────────────────────────────────────────────────

function CompleteButton({ onComplete, disabled }: { onComplete: (() => Promise<void>) | null; disabled?: boolean }) {
  const [pending, setPending] = useState(false)
  if (!onComplete) return null

  async function handleClick() {
    setPending(true)
    try { await onComplete!() }
    catch (e) { console.error('completeStep error:', e) }
    finally { setPending(false) }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || pending}
      className="text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 disabled:opacity-40 transition-opacity"
      style={{ background: 'var(--accent)', color: '#fff' }}
    >
      {pending ? 'Guardando…' : 'Marcar como completado'}
    </button>
  )
}

// ── Reading / Video / Task ────────────────────────────────────────────────────

function ReadingDetail({ stepId, stepTitle, stepDescription, onComplete }: {
  stepId: string
  stepTitle: string
  stepDescription: string | null
  onComplete: (() => Promise<void>) | null
}) {
  const [readingStatus, setReadingStatus] = useState<'loading' | 'published' | 'draft' | 'error'>('loading')
  const [readingContent, setReadingContent] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/reading', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stepId, stepTitle }),
    })
      .then(r => r.json())
      .then((data: { content: string | null; status?: string }) => {
        if (data.content && data.status === 'published') {
          setReadingContent(data.content)
          setReadingStatus('published')
        } else {
          setReadingStatus('draft')
        }
      })
      .catch(() => setReadingStatus('error'))
  }, [stepId, stepTitle])

  if (readingStatus === 'loading') {
    return (
      <div className="flex items-center gap-3 py-4" style={{ color: 'var(--text-muted)' }}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Buddy está preparando el material de estudio…</span>
      </div>
    )
  }

  if (readingStatus === 'draft') {
    return (
      <div className="flex flex-col gap-4">
        <div
          className="flex items-start gap-3 rounded-xl px-4 py-3"
          style={{ background: 'var(--bg-overlay)', border: '1px solid var(--border-subtle)' }}
        >
          <Clock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }} />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              Material en preparación
            </p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              El contenido de este paso está siendo revisado por el equipo antes de publicarse. Mientras tanto, podés consultar a Buddy tus dudas.
            </p>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--border-subtle)' }} />
        <Link
          href={`/app/chat?context=${encodeURIComponent(stepTitle)}`}
          className="self-start inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <MessageCircle size={15} />
          Preguntarle a Buddy sobre esto
        </Link>
      </div>
    )
  }

  if (readingStatus === 'error') {
    return (
      <div className="flex flex-col gap-4">
        {stepDescription && (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{stepDescription}</p>
        )}
        <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }} />
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/app/chat?context=${encodeURIComponent(stepTitle)}`}
            className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            <MessageCircle size={15} />
            Preguntarle a Buddy sobre esto
          </Link>
          <CompleteButton onComplete={onComplete} />
        </div>
      </div>
    )
  }

  // published
  return (
    <div className="flex flex-col gap-4">
      <div className="reading-content">
        <ReactMarkdown>{readingContent ?? ''}</ReactMarkdown>
      </div>
      <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }} />
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/app/chat?context=${encodeURIComponent(stepTitle)}`}
          className="inline-flex items-center gap-2 text-sm font-medium rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
        >
          <MessageCircle size={15} />
          Preguntarle a Buddy sobre esto
        </Link>
        {onComplete ? <CompleteButton onComplete={onComplete} /> : <CompletedBadge />}
      </div>
    </div>
  )
}

// ── Access Request ────────────────────────────────────────────────────────────

function AccessRequestDetail({ stepContent, onComplete }: {
  stepContent: unknown
  onComplete: (() => Promise<void>) | null
}) {
  const checklist = (stepContent as { checklist?: string[] } | null)?.checklist ?? []
  const [checked, setChecked] = useState<boolean[]>(new Array(checklist.length).fill(false))
  const allChecked = checklist.length > 0 && checked.every(Boolean)
  const isCompleted = !onComplete

  function toggle(i: number) {
    if (isCompleted) return
    setChecked(prev => prev.map((v, idx) => idx === i ? !v : v))
  }

  return (
    <div className="flex flex-col gap-4">
      {checklist.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {checklist.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => toggle(i)}
                className="mt-0.5 shrink-0 transition-colors"
                style={{ color: isCompleted || checked[i] ? '#22c55e' : 'var(--text-muted)', cursor: isCompleted ? 'default' : 'pointer' }}
              >
                <CheckSquare size={17} style={{ opacity: isCompleted || checked[i] ? 1 : 0.35 }} />
              </button>
              <span
                className="text-sm"
                style={{
                  color: 'var(--text-primary)',
                  textDecoration: isCompleted || checked[i] ? 'line-through' : undefined,
                  opacity: isCompleted || checked[i] ? 0.5 : 1,
                }}
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin checklist definido para este paso.</p>
      )}
      {isCompleted ? <CompletedBadge /> : <CompleteButton onComplete={onComplete} disabled={!allChecked} />}
    </div>
  )
}

// ── Meeting ───────────────────────────────────────────────────────────────────

function MeetingDetail({ stepContent, stepDescription, onComplete }: {
  stepContent: unknown
  stepDescription: string | null
  onComplete: (() => Promise<void>) | null
}) {
  const agenda = (stepContent as { agenda?: string[] } | null)?.agenda ?? []
  const [confirmed, setConfirmed] = useState(false)
  const isCompleted = !onComplete

  return (
    <div className="flex flex-col gap-4">
      {stepDescription && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{stepDescription}</p>
      )}
      {agenda.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-muted)' }}>
            Agenda
          </p>
          <ul className="flex flex-col gap-1.5">
            {agenda.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <span style={{ color: 'var(--accent)', flexShrink: 0 }}>{i + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      {isCompleted ? (
        <CompletedBadge />
      ) : (
        <>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
              Confirmo que realicé esta reunión con mi manager
            </span>
          </label>
          <CompleteButton onComplete={onComplete} disabled={!confirmed} />
        </>
      )}
    </div>
  )
}

// ── Assessment ────────────────────────────────────────────────────────────────

function AssessmentDetail({ stepId, stepTitle, stepContent, onComplete }: {
  stepId: string
  stepTitle: string
  stepContent: unknown
  onComplete: (() => Promise<void>) | null
}) {
  const passingScore = (stepContent as { passingScore?: number } | null)?.passingScore ?? 70
  const [assessState, setAssessState] = useState<AssessmentState>('idle')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [results, setResults] = useState<AssessmentResults | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function startAssessment() {
    setAssessState('loading_questions')
    setError(null)
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', stepId, stepTitle }),
      })
      if (!res.ok) throw new Error('Error al generar preguntas')
      const data = await res.json() as { questions: Question[] }
      setQuestions(data.questions)
      setAnswers(new Array(data.questions.length).fill(''))
      setAssessState('answering')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setAssessState('idle')
    }
  }

  async function submitAnswers() {
    setAssessState('evaluating')
    setError(null)
    try {
      const res = await fetch('/api/assessment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate', stepId, stepTitle, questions, answers, passingScore }),
      })
      if (!res.ok) throw new Error('Error al evaluar respuestas')
      const data = await res.json() as AssessmentResults
      setResults(data)
      setAssessState('results')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado')
      setAssessState('answering')
    }
  }

  function setAnswer(i: number, value: string) {
    setAnswers(prev => prev.map((v, idx) => idx === i ? value : v))
  }

  function reset() {
    setAssessState('idle')
    setResults(null)
    setQuestions([])
    setAnswers([])
    setError(null)
  }

  const allAnswered = answers.length > 0 && answers.every(a => a.trim() !== '')

  // idle
  if (assessState === 'idle') {
    if (!onComplete) {
      return (
        <div className="flex flex-col gap-3">
          <CompletedBadge />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Ya completaste esta evaluación.
          </p>
        </div>
      )
    }
    return (
      <div className="flex flex-col gap-3">
        {error && (
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Buddy preparará preguntas sobre este tema. Necesitás un {passingScore}% para aprobar.
        </p>
        <button
          type="button"
          onClick={startAssessment}
          className="self-start text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Comenzar evaluación
        </button>
      </div>
    )
  }

  // loading questions or evaluating
  if (assessState === 'loading_questions' || assessState === 'evaluating') {
    return (
      <div className="flex items-center gap-3 py-2" style={{ color: 'var(--text-muted)' }}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">
          {assessState === 'loading_questions'
            ? 'Buddy está preparando tus preguntas…'
            : 'Buddy está evaluando tus respuestas…'}
        </span>
      </div>
    )
  }

  // answering
  if (assessState === 'answering') {
    return (
      <div className="flex flex-col gap-5">
        {error && (
          <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ background: '#fef2f2', color: '#dc2626' }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}
        {questions.map((q, i) => (
          <div key={i} className="flex flex-col gap-2">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
              {i + 1}. {q.question}
            </p>
            {q.type === 'multiple_choice' && q.options ? (
              <div className="flex flex-col gap-1.5 pl-3">
                {q.options.map(option => (
                  <label key={option} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="radio"
                      name={`q-${i}`}
                      value={option}
                      checked={answers[i] === option}
                      onChange={() => setAnswer(i, option)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{option}</span>
                  </label>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[i] ?? ''}
                onChange={e => setAnswer(i, e.target.value)}
                placeholder="Escribí tu respuesta…"
                rows={3}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={submitAnswers}
          disabled={!allAnswered}
          className="self-start text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 disabled:opacity-40 transition-opacity"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          Enviar respuestas
        </button>
      </div>
    )
  }

  // results
  if (!results) return null

  return (
    <div className="flex flex-col gap-4">
      <div
        className="rounded-xl p-4 flex flex-col items-center gap-1"
        style={{
          background: results.passed ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${results.passed ? '#86efac' : '#fca5a5'}`,
        }}
      >
        {results.passed
          ? <Trophy size={28} style={{ color: '#22c55e' }} />
          : <XCircle size={28} style={{ color: '#ef4444' }} />}
        <p className="text-2xl font-bold" style={{ color: results.passed ? '#15803d' : '#dc2626' }}>
          {results.score}%
        </p>
        <p className="text-sm" style={{ color: results.passed ? '#166534' : '#991b1b' }}>
          {results.passed ? '¡Aprobado!' : `No aprobado — necesitás ${passingScore}%`}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {results.results.map((r, i) => (
          <div
            key={i}
            className="rounded-lg p-3 flex flex-col gap-1"
            style={{
              background: r.correct ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${r.correct ? '#bbf7d0' : '#fecaca'}`,
            }}
          >
            <div className="flex items-start gap-2">
              <span className="shrink-0 mt-0.5">
                {r.correct
                  ? <CheckCircle2 size={15} style={{ color: '#22c55e' }} />
                  : <XCircle size={15} style={{ color: '#ef4444' }} />}
              </span>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {questions[i]?.question}
              </p>
            </div>
            <p className="text-xs pl-5" style={{ color: 'var(--text-muted)' }}>
              Tu respuesta: <em>{answers[i]}</em>
            </p>
            <p className="text-xs pl-5 leading-relaxed" style={{ color: r.correct ? '#166534' : '#991b1b' }}>
              {r.feedback}
            </p>
          </div>
        ))}
      </div>

      {results.generalFeedback && (
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          {results.generalFeedback}
        </p>
      )}

      <div className="flex gap-3 flex-wrap">
        {results.passed ? (
          <CompleteButton onComplete={onComplete} />
        ) : (
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-2 text-sm font-semibold rounded-xl px-4 py-2 hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            <RotateCcw size={14} />
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  )
}

// ── Main dispatch ─────────────────────────────────────────────────────────────

export default function StepDetail({
  stepType, stepTitle, stepDescription, stepContent, stepId, progressId, onComplete,
}: StepDetailProps) {
  void progressId // included in props for future use

  let detail: React.ReactNode
  switch (stepType) {
    case 'assessment':
      detail = <AssessmentDetail stepId={stepId} stepTitle={stepTitle} stepContent={stepContent} onComplete={onComplete} />
      break
    case 'access_request':
      detail = <AccessRequestDetail stepContent={stepContent} onComplete={onComplete} />
      break
    case 'meeting':
      detail = <MeetingDetail stepContent={stepContent} stepDescription={stepDescription} onComplete={onComplete} />
      break
    default: // reading, video, task
      detail = <ReadingDetail stepId={stepId} stepTitle={stepTitle} stepDescription={stepDescription} onComplete={onComplete} />
  }

  return (
    <div
      className="flex flex-col gap-4 pb-4"
      style={{
        paddingLeft: 44,
        paddingRight: 4,
        borderTop: '1px solid var(--border-subtle)',
        background: 'var(--bg-elevated)',
        paddingTop: 12,
      }}
    >
      {detail}
    </div>
  )
}
