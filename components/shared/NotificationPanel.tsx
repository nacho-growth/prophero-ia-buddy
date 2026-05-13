'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, X, Check } from 'lucide-react'
import { SkeletonRow } from './Skeleton'

type NotifType = 'success' | 'warning' | 'alert' | 'info'

interface Notification {
  id: string
  type: NotifType
  title: string
  body: string
  created_at: string
  is_read: boolean
  deep_link?: string | null
}

const TYPE_COLOR: Record<NotifType, string> = {
  success: '#22c55e',
  warning: '#eab308',
  alert: '#ef4444',
  info: '#3b82f6',
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function NotifItem({
  notif,
  onMarkRead,
  onClose,
}: {
  notif: Notification
  onMarkRead: (id: string) => void
  onClose: () => void
}) {
  const sharedStyle = {
    borderLeft: notif.is_read ? '3px solid transparent' : '3px solid var(--accent)',
    backgroundColor: notif.is_read ? 'transparent' : 'var(--bg-elevated)',
  }

  const inner = (
    <>
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-lg mt-0.5"
        style={{ width: 32, height: 32, backgroundColor: `${TYPE_COLOR[notif.type]}20` }}
      >
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: TYPE_COLOR[notif.type] }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--text-primary)', fontWeight: notif.is_read ? 400 : 600 }}
          >
            {notif.title}
          </p>
          <div className="flex items-center gap-1 flex-shrink-0">
            {!notif.is_read && (
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
            )}
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {timeAgo(notif.created_at)}
            </span>
          </div>
        </div>
        <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
          {notif.body}
        </p>
      </div>
    </>
  )

  if (notif.deep_link) {
    return (
      <Link
        href={notif.deep_link}
        onClick={() => { void onMarkRead(notif.id); onClose() }}
        className="w-full text-left px-4 py-3 flex gap-3 transition-colors block"
        style={sharedStyle}
      >
        {inner}
      </Link>
    )
  }

  return (
    <button
      onClick={() => onMarkRead(notif.id)}
      className="cursor-pointer w-full text-left px-4 py-3 flex gap-3 transition-colors"
      style={sharedStyle}
    >
      {inner}
    </button>
  )
}

interface NotificationPanelProps {
  userId: string
  tenantId: string
  onClose: () => void
}

export default function NotificationPanel({ userId, tenantId, onClose }: NotificationPanelProps) {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetch(`/api/notifications?userId=${userId}&tenantId=${tenantId}`)
      .then((r) => r.json())
      .then((data) => { setNotifications(data ?? []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [userId, tenantId])

  async function markAllRead() {
    await fetch('/api/notifications/read-all', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, tenantId }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    router.refresh()
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n))
    router.refresh()
  }

  const visible = filter === 'unread' ? notifications.filter((n) => !n.is_read) : notifications
  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      <aside
        className="fixed right-0 top-0 bottom-0 z-50 flex flex-col slide-over"
        style={{ width: 380, backgroundColor: 'var(--bg-surface)', borderLeft: '1px solid var(--border-subtle)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Notificaciones
            </span>
            {unreadCount > 0 && (
              <span
                className="px-1.5 py-0.5 rounded-full text-xs font-bold"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                style={{ color: 'var(--accent)' }}
              >
                <Check className="w-3 h-3" />
                Marcar todas
              </button>
            )}
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          className="flex px-4 gap-2 py-2 flex-shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {(['all', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
              style={
                filter === tab
                  ? { backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }
                  : { color: 'var(--text-secondary)' }
              }
            >
              {tab === 'all' ? 'Todas' : 'No leídas'}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {loading ? (
            <div className="flex flex-col gap-3 px-4 pt-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={2} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
              <Bell className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {filter === 'unread' ? 'No hay notificaciones sin leer' : 'No hay notificaciones'}
              </p>
            </div>
          ) : (
            visible.map((notif) => (
              <NotifItem
                key={notif.id}
                notif={notif}
                onMarkRead={markRead}
                onClose={onClose}
              />
            ))
          )}
        </div>

        <div className="flex-shrink-0 px-4 py-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <Link
            href="/app/notificaciones"
            onClick={onClose}
            className="block text-center text-sm font-medium transition-colors"
            style={{ color: 'var(--accent)' }}
          >
            Ver todas las notificaciones
          </Link>
        </div>
      </aside>
    </>
  )
}
