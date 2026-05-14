'use client'

import { useEffect, useRef, useState, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, Plus, MessageSquare, Loader2 } from 'lucide-react'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

function ChatPage() {
  const searchParams = useSearchParams()
  const contextParam = searchParams.get('context')

  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/chat/conversations', { signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (controller.signal.aborted) return
        const convs: Conversation[] = d.conversations ?? []
        setConversations(convs)

        if (!contextParam) return

        const existingConv = convs.find(c => c.title === `Consulta: ${contextParam}`)
        if (existingConv) {
          loadConversation(existingConv.id)
          return
        }

        const autoMessage = `Estoy estudiando el tema "${contextParam}" en mi onboarding. ¿Podés explicarme los conceptos clave de este tema y responder dudas que tenga?`
        setSending(true)
        const optimistic: Message = {
          id: `tmp-${Date.now()}`,
          role: 'user',
          content: autoMessage,
          created_at: new Date().toISOString(),
        }
        setMessages([optimistic])

        fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: autoMessage, title: `Consulta: ${contextParam}` }),
        })
          .then(r => r.json())
          .then(data => {
            if (!data.content) return
            const assistantMsg: Message = {
              id: `tmp-a-${Date.now()}`,
              role: 'assistant',
              content: data.content,
              created_at: new Date().toISOString(),
            }
            setMessages(prev => [...prev, assistantMsg])
            if (data.conversationId) {
              setActiveConvId(data.conversationId)
              const newConv: Conversation = {
                id: data.conversationId,
                title: `Consulta: ${contextParam}`,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
              setConversations(prev => {
                if (prev.some(c => c.id === data.conversationId)) return prev
                return [newConv, ...prev]
              })
            }
          })
          .catch(() => setMessages([]))
          .finally(() => setSending(false))
      })
      .catch(e => {
        if (e.name === 'AbortError') return
      })

    return () => controller.abort()
  }, [contextParam])

  function loadConversation(convId: string) {
    if (convId === activeConvId) return
    setActiveConvId(convId)
    setMessages([])
    setLoadingMsgs(true)
    fetch(`/api/chat/messages?conversationId=${convId}`)
      .then(r => r.json())
      .then(d => {
        if (d.messages) setMessages(d.messages)
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false))
  }

  function startNew() {
    setActiveConvId(null)
    setMessages([])
    setInput('')
    textareaRef.current?.focus()
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setInput('')

    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, optimistic])
    setSending(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, conversationId: activeConvId ?? undefined }),
      })
      const data: { content?: string; conversationId?: string; error?: string } = await res.json()

      if (!res.ok || !data.content) {
        setMessages(prev => prev.filter(m => m.id !== optimistic.id))
        return
      }

      const assistantMsg: Message = {
        id: `tmp-a-${Date.now()}`,
        role: 'assistant',
        content: data.content,
        created_at: new Date().toISOString(),
      }
      setMessages(prev => [...prev, assistantMsg])

      if (data.conversationId && data.conversationId !== activeConvId) {
        setActiveConvId(data.conversationId)
        const title = text.length > 60 ? text.slice(0, 60) + '…' : text
        const newConv: Conversation = {
          id: data.conversationId,
          title,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        setConversations(prev => {
          if (prev.some(c => c.id === data.conversationId)) return prev
          return [newConv, ...prev]
        })
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
    } finally {
      setSending(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function autoResize(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  const agentName = process.env.NEXT_PUBLIC_AGENT_NAME ?? 'IA Buddy'

  return (
    <div className="flex h-full" style={{ height: 'calc(100vh - var(--header-height))' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col flex-shrink-0 overflow-hidden"
        style={{
          width: 240,
          borderRight: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--bg-surface)',
        }}
      >
        <div className="p-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={startNew}
            className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            <Plus className="w-4 h-4" />
            Nueva conversación
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {conversations.length === 0 ? (
            <p className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
              Aún no hay conversaciones
            </p>
          ) : (
            conversations.map(conv => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className="flex items-start gap-2 w-full px-3 py-2.5 text-left transition-colors"
                style={{
                  backgroundColor: conv.id === activeConvId ? 'var(--bg-elevated)' : 'transparent',
                  color: conv.id === activeConvId ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                <span className="text-xs leading-snug line-clamp-2">{conv.title}</span>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {loadingMsgs ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: 'var(--text-muted)' }} />
            </div>
          ) : messages.length === 0 ? (
            <WelcomeState agentName={agentName} onSuggest={t => { setInput(t); textareaRef.current?.focus() }} />
          ) : (
            <div className="max-w-2xl mx-auto flex flex-col gap-4">
              {messages.map(msg => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {sending && (
                <div className="flex gap-3 items-start">
                  <div
                    className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(45,91,227,0.3)' }}
                  >
                    <img src="/buddy.png" alt="" style={{ width: 16, height: 16, borderRadius: 4 }} />
                  </div>
                  <div
                    className="rounded-2xl px-4 py-2.5 text-sm"
                    style={{ backgroundColor: 'var(--bg-elevated)', color: 'var(--text-secondary)' }}
                  >
                    <span className="flex gap-1">
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>•</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>•</span>
                    </span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div
          className="px-4 py-3"
          style={{ borderTop: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
        >
          <div
            className="max-w-2xl mx-auto flex items-end gap-2 rounded-xl px-3 py-2"
            style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-default)' }}
          >
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={autoResize}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu pregunta…"
              className="flex-1 resize-none bg-transparent text-sm focus:outline-none leading-relaxed"
              style={{ color: 'var(--text-primary)', minHeight: 24, maxHeight: 160 }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="flex-shrink-0 flex items-center justify-center rounded-lg w-8 h-8 transition-opacity disabled:opacity-40"
              style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-center text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            Presiona Enter para enviar · Shift+Enter para nueva línea
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ChatPageWrapper() {
  return (
    <Suspense fallback={null}>
      <ChatPage />
    </Suspense>
  )
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user'
  return (
    <div className={`flex gap-3 items-start ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div
          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(45,91,227,0.3)' }}
        >
          <img src="/buddy.png" alt="" style={{ width: 16, height: 16, borderRadius: 4 }} />
        </div>
      )}
      <div
        className="max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={
          isUser
            ? { backgroundColor: 'var(--accent)', color: '#fff' }
            : { backgroundColor: 'var(--bg-elevated)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }
        }
      >
        {message.content}
      </div>
    </div>
  )
}

function WelcomeState({ agentName, onSuggest }: { agentName: string; onSuggest: (text: string) => void }) {
  const suggestions = [
    '¿Qué hacemos en PropHero?',
    '¿Cuáles son los fees de PropHero?',
    '¿Me explicás cómo es el procedimiento de Arras? ¿Cuándo se firma?',
    '¿Cuáles son los pasos del proceso de compra?',
  ]

  return (
    <div className="max-w-2xl mx-auto flex flex-col items-center text-center py-12">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--accent-dim)', border: '1px solid rgba(45,91,227,0.3)' }}
      >
        <img src="/buddy.png" alt={agentName} style={{ width: 36, height: 36, borderRadius: 10 }} />
      </div>
      <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
        Hola, soy {agentName}
      </h2>
      <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>
        Estoy aquí para ayudarte con todo lo que necesites durante tu onboarding.
        Pregúntame sobre procesos, herramientas, cultura o cualquier duda que tengas.
      </p>
      <div className="grid grid-cols-1 gap-2 w-full sm:grid-cols-2">
        {suggestions.map(s => (
          <button
            key={s}
            onClick={() => onSuggest(s)}
            className="text-left px-4 py-3 rounded-xl text-sm transition-colors"
            style={{
              backgroundColor: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-secondary)',
            }}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
