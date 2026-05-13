import Link from 'next/link'
import { MessageCircle, BookOpen, Users, BarChart3 } from 'lucide-react'

const ACTIONS = [
  { href: '/app/chat', icon: MessageCircle, label: 'Hablar con IA', color: 'var(--accent)' },
  { href: '/app/knowledge', icon: BookOpen, label: 'Conocimiento', color: '#8b5cf6' },
  { href: '/app/team', icon: Users, label: 'Mi equipo', color: '#0ea5e9' },
  { href: '/app/progress', icon: BarChart3, label: 'Mi progreso', color: '#22c55e' },
]

export default function HomeQuickActions() {
  return (
    <div className="rounded-xl p-5 flex flex-col gap-4" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Acciones rápidas</span>
      <div className="grid grid-cols-2 gap-3">
        {ACTIONS.map(({ href, icon: Icon, label, color }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-center gap-2 rounded-xl py-3 px-2 text-center hover:opacity-80 transition-opacity"
            style={{ background: 'var(--bg-elevated)' }}
          >
            <Icon size={22} style={{ color }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
