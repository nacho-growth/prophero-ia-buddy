'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Bell, ChevronDown, User, LogOut } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/supabase/types'

const MANAGER_ROLES = ['manager', 'hr_admin', 'tenant_admin', 'super_admin']

interface HeaderProps {
  user: UserProfile
  unreadCount: number
  world: 'app' | 'admin'
  onNotifOpen: () => void
}

export default function Header({ user, unreadCount, world, onNotifOpen }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const canSwitchWorld = MANAGER_ROLES.includes(user.role)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-subtle)',
      }}
    >
      <div className="flex items-center gap-2">
        <img src="/buddy.png" style={{ width: 28, height: 28, borderRadius: 7 }} alt="PropHero Buddy" />
        <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: '0.9375rem' }}>
          PropHero{' '}
          <span style={{ color: 'var(--accent)' }}>Buddy</span>
        </span>
        {world === 'admin' && (
          <span
            className="ml-1 px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent-dim)', color: 'var(--accent)' }}
          >
            Admin
          </span>
        )}
      </div>

      <div className="flex items-center gap-1">
        {canSwitchWorld && (
          <Link
            href={world === 'app' ? '/admin/people' : '/app/home'}
            className="flex items-center justify-center rounded-lg transition-colors"
            style={{ width: 36, height: 36, color: 'var(--text-secondary)' }}
            title={world === 'app' ? 'Ir al panel Admin' : 'Ir a la app'}
          >
            <ArrowLeftRight className="w-4 h-4" />
          </Link>
        )}

        <button
          onClick={onNotifOpen}
          className="cursor-pointer relative flex items-center justify-center rounded-lg transition-colors"
          style={{ width: 36, height: 36, color: 'var(--text-secondary)' }}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
          )}
        </button>

        <div className="relative">
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="cursor-pointer flex items-center gap-2 rounded-lg px-2 py-1 transition-colors"
            style={{ color: 'var(--text-secondary)' }}
          >
            <div
              className="flex items-center justify-center rounded-full text-xs font-semibold"
              style={{ width: 28, height: 28, backgroundColor: 'var(--bg-overlay)', color: 'var(--text-primary)' }}
            >
              {user.full_name?.[0]?.toUpperCase() ?? '?'}
            </div>
            <ChevronDown className="w-3 h-3" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
              <div
                className="absolute right-0 top-full mt-1 w-56 rounded-xl z-50 py-1 shadow-xl"
                style={{ backgroundColor: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
              >
                <div className="px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                    {user.full_name}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                </div>
                <Link
                  href="/app/perfil"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-overlay)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <User className="w-4 h-4" />
                  Mi perfil
                </Link>
                <Link
                  href="/app/perfil#notificaciones"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-overlay)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <Bell className="w-4 h-4" />
                  Notificaciones
                </Link>
                <div style={{ borderTop: '1px solid var(--border-subtle)', marginTop: 4 }} />
                <button
                  onClick={handleSignOut}
                  className="cursor-pointer flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-[var(--bg-overlay)]"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar sesión
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
