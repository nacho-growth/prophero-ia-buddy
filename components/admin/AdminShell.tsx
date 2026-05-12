'use client'

import { useState } from 'react'
import Header from '@/components/shared/Header'
import AdminSidebar from '@/components/admin/AdminSidebar'
import NotificationPanel from '@/components/shared/NotificationPanel'
import type { UserProfile } from '@/lib/supabase/types'

interface AdminShellProps {
  user: UserProfile
  unreadCount: number
  children: React.ReactNode
}

export default function AdminShell({ user, unreadCount, children }: AdminShellProps) {
  const [notifOpen, setNotifOpen] = useState(false)

  return (
    <>
      <Header user={user} unreadCount={unreadCount} world="admin" onNotifOpen={() => setNotifOpen(true)} />
      <AdminSidebar role={user.role} />
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
