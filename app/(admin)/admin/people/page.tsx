import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import PeoplePageClient, { type Employee } from '@/components/admin/people/PeoplePageClient'

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string }>
}) {
  const { team: teamFilter } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile) redirect('/login')
  const tenantId = adminProfile.tenant_id as string

  const admin = createAdminClient()

  let employeesQuery = admin
    .from('users')
    .select(`
      id, full_name, email, job_title, role, onboarding_status, hire_date, last_active_at,
      teams!users_team_id_fkey(name),
      employee_profiles(xp_total, current_level, last_sentiment, onboarding_day)
    `)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)

  if (teamFilter) {
    employeesQuery = employeesQuery.eq('team_id', teamFilter)
  }

  const [employeesResult, progressResult, teamsResult, accessRequestsResult] = await Promise.all([
    employeesQuery.order('full_name'),
    admin
      .from('user_onboarding_progress')
      .select('user_id, status')
      .eq('tenant_id', tenantId),
    admin
      .from('teams')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('name'),
    admin
      .from('access_requests')
      .select('id, email, message, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ])

  const progressByUser: Record<string, { total: number; completed: number }> = {}
  for (const row of progressResult.data ?? []) {
    const uid = row.user_id as string
    if (!progressByUser[uid]) progressByUser[uid] = { total: 0, completed: 0 }
    progressByUser[uid].total++
    if (row.status === 'completed') progressByUser[uid].completed++
  }

  const employees = (employeesResult.data ?? []) as unknown as Employee[]
  const teams = (teamsResult.data ?? []) as { id: string; name: string }[]
  const accessRequests = (accessRequestsResult.data ?? []) as { id: string; email: string; message: string | null; created_at: string }[]

  return (
    <PeoplePageClient
      employees={employees}
      teams={teams}
      progressByUser={progressByUser}
      teamFilter={teamFilter}
      accessRequests={accessRequests}
    />
  )
}
