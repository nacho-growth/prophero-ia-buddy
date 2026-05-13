import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppShell from '@/components/app/AppShell'
import type { UserProfile } from '@/lib/supabase/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, email, avatar_url, role, tenant_id, team_id, job_title, hire_date, onboarding_status, tenants(name)')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('tenant_id', profile.tenant_id)
    .eq('is_read', false)
    .then((r) => ({ count: r.count ?? 0 }))

  const userProfile: UserProfile = {
    id: profile.id,
    tenant_id: profile.tenant_id,
    team_id: profile.team_id ?? null,
    email: profile.email,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url ?? null,
    role: profile.role,
    job_title: profile.job_title ?? null,
    hire_date: profile.hire_date ?? null,
    onboarding_status: profile.onboarding_status,
    tenant_name: (profile.tenants as unknown as { name: string } | null)?.name ?? '',
  }

  return (
    <AppShell user={userProfile} unreadCount={unreadCount ?? 0}>
      <main
        style={{
          marginTop: 'var(--header-height)',
          marginLeft: 'var(--sidebar-width)',
          padding: '28px 32px',
          minHeight: 'calc(100vh - var(--header-height))',
        }}
      >
        {children}
      </main>
    </AppShell>
  )
}
