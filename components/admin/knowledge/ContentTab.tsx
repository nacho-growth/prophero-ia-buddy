'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle2, Clock, RefreshCw, Eye, ChevronDown, ChevronRight,
  BookOpen, CheckSquare, PlayCircle, Users, Brain, Key, Pencil,
} from 'lucide-react'

interface StepContent {
  generated_reading?: string
  reading_status?: 'draft' | 'published'
  generated_at?: string
}

export interface StepWithContent {
  id: string
  title: string
  type: string
  step_order: number
  content: StepContent | null
}

const TYPE_ICONS: Record<string, React.ReactNode> = {
  reading:        <BookOpen size={14} />,
  task:           <CheckSquare size={14} />,
  video:          <PlayCircle size={14} />,
  meeting:        <Users size={14} />,
  assessment:     <Brain size={14} />,
  access_request: <Key size={14} />,
}

const CONTENT_TYPES = new Set(['reading', 'video', 'task'])
const STRUCTURED_TYPES = new Set(['assessment', 'access_request', 'meeting'])

type LoadingState = 'generating' | 'publishing' | null

function getEffectiveStatus(
  step: StepWithContent,
  localStatuses: Record<string, 'draft' | 'published'>,
): 'none' | 'draft' | 'published' {
  const override = localStatuses[step.id]
  if (override) return override
  const rs = step.content?.reading_status
  if (rs === 'published') return 'published'
  if (rs === 'draft') return 'draft'
  return 'none'
}

export default function ContentTab({ steps }: { steps: StepWithContent[] }) {
  const router = useRouter()
  const [loadingMap, setLoadingMap] = useState<Record<string, LoadingState>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'draft' | 'published'>>({})
  const [localContents, setLocalContents] = useState<Record<string, string>>({})
  const [editedContents, setEditedContents] = useState<Record<string, string>>({})
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null)

  function getContent(step: StepWithContent): string | null {
    return localContents[step.id] ?? step.content?.generated_reading ?? null
  }

  function getEditableContent(step: StepWithContent): string {
    return editedContents[step.id] ?? localContents[step.id] ?? step.content?.generated_reading ?? ''
  }

  async function fetchContent(stepId: string): Promise<string | null> {
    const res = await fetch(`/api/admin/content?stepId=${stepId}`)
    const data = await res.json() as { content: string | null }
    return data.content
  }

  async function handleGenerate(step: StepWithContent) {
    setLoadingMap(prev => ({ ...prev, [step.id]: 'generating' }))
    try {
      await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: step.id, stepTitle: step.title }),
      })
      const content = await fetchContent(step.id)
      if (content) setLocalContents(prev => ({ ...prev, [step.id]: content }))
      setLocalStatuses(prev => ({ ...prev, [step.id]: 'draft' }))
      setExpandedId(step.id)
    } finally {
      setLoadingMap(prev => ({ ...prev, [step.id]: null }))
    }
  }

  async function handleRegenerate(step: StepWithContent) {
    setConfirmRegenId(null)
    setLoadingMap(prev => ({ ...prev, [step.id]: 'generating' }))
    try {
      await fetch('/api/reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId: step.id, stepTitle: step.title, force: true }),
      })
      const content = await fetchContent(step.id)
      if (content) setLocalContents(prev => ({ ...prev, [step.id]: content }))
      setLocalStatuses(prev => ({ ...prev, [step.id]: 'draft' }))
      setExpandedId(step.id)
    } finally {
      setLoadingMap(prev => ({ ...prev, [step.id]: null }))
    }
  }

  async function handlePublish(stepId: string, content: string) {
    setLoadingMap(prev => ({ ...prev, [stepId]: 'publishing' }))
    try {
      await fetch('/api/admin/content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stepId, content }),
      })
      setLocalStatuses(prev => ({ ...prev, [stepId]: 'published' }))
      setExpandedId(null)
      router.refresh()
    } finally {
      setLoadingMap(prev => ({ ...prev, [stepId]: null }))
    }
  }

  async function handleExpandDraft(step: StepWithContent) {
    if (expandedId === step.id) {
      setExpandedId(null)
      return
    }
    // If we don't have content locally yet, fetch it
    if (!localContents[step.id] && !step.content?.generated_reading) {
      const content = await fetchContent(step.id)
      if (content) setLocalContents(prev => ({ ...prev, [step.id]: content }))
    }
    setExpandedId(step.id)
  }

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
        <BookOpen size={36} style={{ opacity: 0.3 }} />
        <p className="text-sm">No hay pasos de onboarding configurados.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {steps.map(step => {
        const loading = loadingMap[step.id]
        const status = getEffectiveStatus(step, localStatuses)
        const content = getContent(step)
        const isExpanded = expandedId === step.id
        const isStructured = STRUCTURED_TYPES.has(step.type)
        const isConfirmingRegen = confirmRegenId === step.id

        return (
          <div
            key={step.id}
            className="rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            {/* Row */}
            <div className="flex items-center gap-3 px-4 py-3">
              {/* Step number + icon */}
              <div className="flex items-center gap-2 flex-shrink-0" style={{ minWidth: 80 }}>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                  #{step.step_order}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  {TYPE_ICONS[step.type] ?? <BookOpen size={14} />}
                </span>
              </div>

              {/* Title */}
              <p className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {step.title}
              </p>

              {/* Status badge */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isStructured ? (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  >
                    Contenido estructurado
                  </span>
                ) : status === 'published' ? (
                  <span
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
                  >
                    <CheckCircle2 size={11} />
                    Publicado
                  </span>
                ) : status === 'draft' ? (
                  <span
                    className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(251,191,36,0.12)', color: '#d97706' }}
                  >
                    <Clock size={11} />
                    Pendiente de revisión
                  </span>
                ) : (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  >
                    Sin contenido
                  </span>
                )}
              </div>

              {/* Actions */}
              {!isStructured && (
                <div className="flex items-center gap-2 flex-shrink-0">
                  {loading ? (
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <Loader2 size={13} className="animate-spin" />
                      {loading === 'generating' ? 'Generando…' : 'Publicando…'}
                    </span>
                  ) : status === 'none' ? (
                    <button
                      type="button"
                      onClick={() => handleGenerate(step)}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      Generar
                    </button>
                  ) : status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => handleExpandDraft(step)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(45,91,227,0.3)' }}
                    >
                      <Eye size={12} />
                      Ver y publicar
                      {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    </button>
                  ) : (
                    /* published */
                    <>
                    <button
                      type="button"
                      onClick={() => handleExpandDraft(step)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--accent-dim)', color: 'var(--accent)', border: '1px solid rgba(45,91,227,0.3)' }}
                    >
                      <Pencil size={12} />
                      Editar
                    </button>
                    {isConfirmingRegen ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>¿Regenerar?</span>
                        <button
                          type="button"
                          onClick={() => handleRegenerate(step)}
                          className="text-xs font-medium px-2 py-1 rounded-lg"
                          style={{ background: '#fef2f2', color: '#ef4444' }}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRegenId(null)}
                          className="text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRegenId(step.id)}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <RefreshCw size={12} />
                        Regenerar
                      </button>
                    )
                    }
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Expanded review panel */}
            {isExpanded && !isStructured && (
              <div
                className="flex flex-col gap-4 px-4 pb-4"
                style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}
              >
                {content !== null ? (
                  <>
                    <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                      Revisá y editá el contenido antes de publicar. Soporta Markdown.
                    </p>
                    <textarea
                      value={getEditableContent(step)}
                      onChange={e => setEditedContents(prev => ({ ...prev, [step.id]: e.target.value }))}
                      className="w-full rounded-xl p-4 text-sm font-mono leading-relaxed resize-none focus:outline-none"
                      style={{
                        background: 'var(--bg-elevated)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                        minHeight: 400,
                        maxHeight: 600,
                      }}
                      rows={20}
                    />
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => handlePublish(step.id, getEditableContent(step))}
                        disabled={!!loading}
                        className="flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
                        style={{ background: '#22c55e', color: '#fff' }}
                      >
                        {loading === 'publishing'
                          ? <><Loader2 size={14} className="animate-spin" /> Publicando…</>
                          : status === 'published'
                            ? <><CheckCircle2 size={14} /> Guardar cambios</>
                            : <><CheckCircle2 size={14} /> Publicar</>}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmRegenId(step.id)}
                        disabled={!!loading}
                        className="flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                      >
                        <RefreshCw size={14} />
                        Regenerar
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-2 py-4" style={{ color: 'var(--text-muted)' }}>
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Cargando contenido…</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
