'use client'

import { useState } from 'react'
import Header from '@/components/shared/Header'
import AppSidebar from '@/components/app/AppSidebar'
import NotificationPanel from '@/components/shared/NotificationPanel'
import type { UserProfile } from '@/lib/supabase/types'

interface AppShellProps {
  user: UserProfile
  unreadCount: number
  children: React.ReactNode
}

export default function AppShell({ user, unreadCount, children }: AppShellProps) {
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <Header user={user} unreadCount={unreadCount} world="app" onNotifOpen={() => setNotifOpen(true)} />
      <AppSidebar />
      {notifOpen && (
        <NotificationPanel
          userId={user.id}
          tenantId={user.tenant_id}
          onClose={() => setNotifOpen(false)}
        />
      )}
      {children}
    </>
  )
}
