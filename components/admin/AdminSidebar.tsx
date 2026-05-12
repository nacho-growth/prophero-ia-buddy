'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, BookOpen, ClipboardList, BarChart2, Megaphone, Zap, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_RANK: Record<UserRole, number> = {
  employee: 0,
  manager: 1,
  hr_admin: 2,
  tenant_admin: 3,
  super_admin: 4,
}

function canAccess(role: UserRole, minRole: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole]
}

const NAV_ITEMS = [
  { href: '/admin/people', icon: Users, label: 'Personas', minRole: 'manager' as UserRole },
  { href: '/admin/knowledge', icon: BookOpen, label: 'Conocimiento', minRole: 'manager' as UserRole },
  { href: '/admin/assessments', icon: ClipboardList, label: 'Evaluaciones', minRole: 'manager' as UserRole },
  { href: '/admin/reports', icon: BarChart2, label: 'Reportes', minRole: 'manager' as UserRole },
  { href: '/admin/announcements', icon: Megaphone, label: 'Anuncios', minRole: 'hr_admin' as UserRole },
  { href: '/admin/skills', icon: Zap, label: 'Skills', minRole: 'tenant_admin' as UserRole },
]

interface AdminSidebarProps {
  role: UserRole
}

export default function AdminSidebar({ role }: AdminSidebarProps) {
  const pathname = usePathname()
  const visibleItems = NAV_ITEMS.filter(({ minRole }) => canAccess(role, minRole))

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
        {visibleItems.map(({ href, icon: Icon, label }) => (
          <Link key={href} href={href} className={cn('nav-item', pathname.startsWith(href) && 'active')}>
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </Link>
        ))}
      </div>

      {canAccess(role, 'tenant_admin') && (
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 8 }}>
          <Link
            href="/admin/settings"
            className={cn('nav-item', pathname.startsWith('/admin/settings') && 'active')}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            Configuración
          </Link>
        </div>
      )}
    </nav>
  )
}
