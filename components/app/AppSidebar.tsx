'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageSquare, Map, Trophy, Users, Bell, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/app/home', icon: Home, label: 'Inicio' },
  { href: '/app/chat', icon: MessageSquare, label: 'Chat' },
  { href: '/app/journey', icon: Map, label: 'Mi camino' },
  { href: '/app/logros', icon: Trophy, label: 'Logros' },
  { href: '/app/equipo', icon: Users, label: 'Equipo' },
  { href: '/app/notificaciones', icon: Bell, label: 'Notificaciones' },
]

export default function AppSidebar() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed flex flex-col px-3 py-3"
      style={{
        top: 'var(--header-height)',
        width: 'var(--sidebar-width)',
        bottom: 0,
        backgroundColor: 'var(--bg-surface)',
        borderRight: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex flex-col gap-0.5 flex-1">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={cn('nav-item', pathname === href && 'active')}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
        <Link href="/app/perfil" className={cn('nav-item', pathname === '/app/perfil' && 'active')}>
          <UserCircle className="w-4 h-4 flex-shrink-0" />
          Mi perfil
        </Link>
      </div>
    </nav>
  )
}
