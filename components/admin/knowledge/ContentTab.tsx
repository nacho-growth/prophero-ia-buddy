'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2, CheckCircle2, Clock, RefreshCw, Eye, ChevronDown, ChevronRight,
  BookOpen, CheckSquare, PlayCircle, Users, Brain, Key, Pencil, Bell, Send, Check,
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

interface Team {
  id: string
  name: string
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

export default function ContentTab({ steps, teams }: { steps: StepWithContent[]; teams: Team[] }) {
  const router = useRouter()
  const [loadingMap, setLoadingMap] = useState<Record<string, LoadingState>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [localStatuses, setLocalStatuses] = useState<Record<string, 'draft' | 'published'>>({})
  const [localContents, setLocalContents] = useState<Record<string, string>>({})
  const [editedContents, setEditedContents] = useState<Record<string, string>>({})
  const [confirmRegenId, setConfirmRegenId] = useState<string | null>(null)
  const [notifyStepId, setNotifyStepId] = useState<string | null>(null)
  const [notifyMessage, setNotifyMessage] = useState('')
  const [notifyAudiences, setNotifyAudiences] = useState<Set<string>>(new Set(['all']))
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifSent, setNotifSent] = useState<Record<string, boolean>>({})

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
      setNotifyStepId(stepId)
      setNotifyMessage('')
      setNotifyAudiences(new Set(['all']))
      router.refresh()
    } finally {
      setLoadingMap(prev => ({ ...prev, [stepId]: null }))
    }
  }

  function toggleAudience(value: string) {
    setNotifyAudiences(prev => {
      const next = new Set(prev)
      if (value === 'all') return new Set(['all'])
      next.delete('all')
      if (next.has(value)) {
        next.delete(value)
        if (next.size === 0) return new Set(['all'])
      } else {
        next.add(value)
      }
      return next
    })
  }

  async function handleSendNotification(stepId: string) {
    if (!notifyMessage.trim()) return
    setSendingNotif(true)
    try {
      if (notifyAudiences.has('all')) {
        await fetch('/api/admin/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepId, message: notifyMessage, audience: 'all' }),
        })
      } else {
        await Promise.all([...notifyAudiences].map(teamId =>
          fetch('/api/admin/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stepId, message: notifyMessage, audience: 'team', teamId }),
          })
        ))
      }
      setNotifSent(prev => ({ ...prev, [stepId]: true }))
      setNotifyStepId(null)
    } finally {
      setSendingNotif(false)
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
                      className="cursor-pointer text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
                      style={{ background: 'var(--accent)', color: '#fff' }}
                    >
                      Generar
                    </button>
                  ) : status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => handleExpandDraft(step)}
                      className="cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
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
                      className="cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
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
                          className="cursor-pointer text-xs font-medium px-2 py-1 rounded-lg"
                          style={{ background: '#fef2f2', color: '#ef4444' }}
                        >
                          Confirmar
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRegenId(null)}
                          className="cursor-pointer text-xs px-2 py-1 rounded-lg"
                          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRegenId(step.id)}
                        className="cursor-pointer flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity"
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

            {/* Notification panel — shown after publish */}
            {notifyStepId === step.id && !notifSent[step.id] && (
              <div
                className="flex flex-col gap-3 px-4 pb-4 pt-4"
                style={{ borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-elevated)' }}
              >
                <div className="flex items-center gap-2">
                  <Bell size={15} style={{ color: 'var(--accent)' }} />
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    ¿Notificar al equipo sobre este cambio?
                  </p>
                </div>
                <textarea
                  value={notifyMessage}
                  onChange={e => setNotifyMessage(e.target.value)}
                  placeholder="Ej: Actualizamos el proceso de arras — nuevo porcentaje de señal"
                  rows={2}
                  className="w-full rounded-lg px-3 py-2 text-sm resize-none focus:outline-none"
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                />
                <div className="flex flex-wrap items-center gap-4">
                  <div
                    className="flex items-center gap-2 cursor-pointer text-sm select-none"
                    style={{ color: 'var(--text-secondary)' }}
                    onClick={() => toggleAudience('all')}
                  >
                    <button
                      type="button"
                      className="flex items-center justify-center rounded w-4 h-4 flex-shrink-0 transition-colors cursor-pointer"
                      style={{
                        background: notifyAudiences.has('all') ? 'var(--accent)' : 'transparent',
                        border: `2px solid ${notifyAudiences.has('all') ? 'var(--accent)' : 'var(--border-strong)'}`,
                      }}
                    >
                      {notifyAudiences.has('all') && <Check size={10} style={{ color: '#fff' }} />}
                    </button>
                    Todos los empleados
                  </div>
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="flex items-center gap-2 cursor-pointer text-sm select-none"
                      style={{ color: 'var(--text-secondary)' }}
                      onClick={() => toggleAudience(team.id)}
                    >
                      <button
                        type="button"
                        className="flex items-center justify-center rounded w-4 h-4 flex-shrink-0 transition-colors cursor-pointer"
                        style={{
                          background: notifyAudiences.has(team.id) ? 'var(--accent)' : 'transparent',
                          border: `2px solid ${notifyAudiences.has(team.id) ? 'var(--accent)' : 'var(--border-strong)'}`,
                        }}
                      >
                        {notifyAudiences.has(team.id) && <Check size={10} style={{ color: '#fff' }} />}
                      </button>
                      {team.name}
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleSendNotification(step.id)}
                    disabled={!notifyMessage.trim() || sendingNotif}
                    className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-40 hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    {sendingNotif
                      ? <><Loader2 size={13} className="animate-spin" /> Enviando...</>
                      : <><Send size={13} /> Enviar notificación</>}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNotifyStepId(null)}
                    className="cursor-pointer text-sm px-3 py-2 rounded-xl hover:opacity-80 transition-opacity"
                    style={{ background: 'var(--bg-surface)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                  >
                    Omitir
                  </button>
                </div>
              </div>
            )}

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
                        className="cursor-pointer flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
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
                        className="cursor-pointer flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-xl hover:opacity-80 disabled:opacity-40 transition-opacity"
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
