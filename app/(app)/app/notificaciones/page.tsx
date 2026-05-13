import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NotificationsPageClient, { type NotificationItem, type NotifType } from '@/components/notifications/NotificationsPageClient'

export default async function NotificacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const { filter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')
  const tenantId = profile.tenant_id as string

  const admin = createAdminClient()
  const { data } = await admin
    .from('notifications')
    .select('id, title, body, notification_type, icon, is_read, created_at, deep_link, event_type')
    .eq('user_id', user.id)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  const notifications: NotificationItem[] = (data ?? []).map(n => ({
    id: n.id as string,
    title: n.title as string,
    body: n.body as string,
    type: ((n.notification_type ?? 'info') as NotifType),
    is_read: n.is_read as boolean,
    created_at: n.created_at as string,
    deep_link: n.deep_link as string | null,
  }))

  return (
    <NotificationsPageClient
      notifications={notifications}
      userId={user.id}
      tenantId={tenantId}
      filter={filter}
    />
  )
}
