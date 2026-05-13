'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Check } from 'lucide-react'

export type NotifType = 'success' | 'warning' | 'alert' | 'info'

export interface NotificationItem {
  id: string
  type: NotifType
  title: string
  body: string
  created_at: string
  is_read: boolean
  deep_link?: string | null
}

interface Props {
  notifications: NotificationItem[]
  userId: string
  tenantId: string
  filter: string | undefined
}

const TYPE_COLOR: Record<NotifType, string> = {
  success: '#22c55e',
  warning: '#eab308',
  alert:   '#ef4444',
  info:    '#3b82f6',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d`
  return new Date(dateStr).toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

function NotifRow({
  notif,
  onMarkRead,
}: {
  notif: NotificationItem
  onMarkRead: (id: string) => void
}) {
  const sharedStyle = {
    borderLeft: notif.is_read ? '3px solid transparent' : '3px solid var(--accent)',
    backgroundColor: notif.is_read ? 'transparent' : 'var(--bg-elevated)',
  }

  const inner = (
    <div className="flex gap-4 items-start w-full px-6 py-4">
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-xl mt-0.5"
        style={{ width: 36, height: 36, backgroundColor: `${TYPE_COLOR[notif.type]}20` }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TYPE_COLOR[notif.type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--text-primary)', fontWeight: notif.is_read ? 400 : 600 }}
          >
            {notif.title}
          </p>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {!notif.is_read && (
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            )}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(notif.created_at)}
            </span>
          </div>
        </div>
        <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {notif.body}
        </p>
      </div>
    </div>
  )

  if (notif.deep_link) {
    return (
      <Link
        href={notif.deep_link}
        onClick={() => { void onMarkRead(notif.id) }}
        className="block w-full text-left transition-colors hover:bg-[var(--bg-elevated)]"
        style={sharedStyle}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      onClick={() => onMarkRead(notif.id)}
      className="cursor-pointer w-full text-left transition-colors hover:bg-[var(--bg-elevated)]"
      style={sharedStyle}
    >
      {inner}
    </button>
  )
}

export default function NotificationsPageClient({ notifications: initial, userId, tenantId, filter }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initial)

  const unreadCount = notifications.filter(n => !n.is_read).length
  const visible = filter === 'unread' ? notifications.filter(n => !n.is_read) : notifications

  async function markAllRead() {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tenantId }),
    })
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    router.refresh()
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Notificaciones
          </h1>
          {unreadCount > 0 && (
            <span
              className="text-sm font-semibold px-2.5 py-0.5 rounded-full"
              style={{ background: 'var(--accent)', color: '#fff' }}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="cursor-pointer flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-elevated)', color: 'var(--accent)', border: '1px solid var(--border-subtle)' }}
          >
            <Check size={14} />
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {([
          { key: undefined,  label: 'Todas',     count: notifications.length },
          { key: 'unread',   label: 'No leídas', count: unreadCount },
        ] as const).map(tab => {
          const isActive = filter === tab.key
          return (
            <Link
              key={tab.label}
              href={tab.key ? `?filter=${tab.key}` : '/app/notificaciones'}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
              style={isActive ? {
                color: 'var(--accent)',
                borderBottom: '2px solid var(--accent)',
                marginBottom: -1,
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* List */}
      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
          <Bell size={36} style={{ opacity: 0.3 }} />
          <p className="text-sm">
            {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl overflow-hidden flex flex-col"
          style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        >
          {visible.map((notif, i) => (
            <div key={notif.id} style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}>
              <NotifRow notif={notif} onMarkRead={markRead} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
