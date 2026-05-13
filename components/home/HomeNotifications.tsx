import { Bell, Info, AlertCircle, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  body: string | null
  type: string | null
  is_read: boolean
  created_at: string
}

interface Props {
  notifications: Notification[]
}

function typeIcon(type: string | null) {
  switch (type) {
    case 'warning': return <AlertCircle size={14} />
    case 'success': return <CheckCircle2 size={14} />
    default:        return <Info size={14} />
  }
}

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diffMs / 60_000)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function HomeNotifications({ notifications }: Props) {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-3" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={18} style={{ color: 'var(--accent)' }} />
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Notificaciones</span>
        </div>
        <Link href="/app/notifications" className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
          Ver todas
        </Link>
      </div>
      {notifications.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin notificaciones recientes</p>
      ) : (
        <ul className="flex flex-col">
          {notifications.map((n, i) => (
            <li
              key={n.id}
              className="flex items-start gap-2 py-2"
              style={{ borderTop: i > 0 ? '1px solid var(--border-subtle)' : undefined }}
            >
              <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }}>
                {typeIcon(n.type)}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: n.is_read ? 'var(--text-muted)' : 'var(--text-primary)' }}
                >
                  {n.title}
                </p>
                {n.body && (
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{n.body}</p>
                )}
              </div>
              <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
                {timeAgo(n.created_at)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
