import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTimeOffEnabled } from '@/lib/skills/time-off'
import AdminTimeOffClient from '@/components/time-off/AdminTimeOffClient'
import { Umbrella } from 'lucide-react'

export default async function AdminTimeOffPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab: rawTab } = await searchParams
  const tab = ['pending', 'history', 'holidays', 'policies'].includes(rawTab ?? '')
    ? (rawTab as string)
    : 'pending'

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
  const enabled = await isTimeOffEnabled(tenantId)

  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Umbrella size={36} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          La skill Time Off no está habilitada para esta organización.
        </p>
      </div>
    )
  }

  const admin = createAdminClient()

  const [pendingResult, allResult, holidaysResult, policiesResult, typesResult] = await Promise.all([
    admin
      .from('time_off_requests')
      .select('id, start_date, end_date, days_count, reason, created_at, users(full_name, email, team_id), time_off_types(name, color)')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at'),

    admin
      .from('time_off_requests')
      .select('id, start_date, end_date, days_count, status, review_comment, reviewed_at, created_at, users(full_name), time_off_types(name, color)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(50),

    admin
      .from('public_holidays')
      .select('id, date, name, country_code')
      .eq('tenant_id', tenantId)
      .order('country_code')
      .order('date'),

    admin
      .from('time_off_policies')
      .select('id, name, days_per_year, carry_over_days, notice_days_required, is_default')
      .eq('tenant_id', tenantId),

    admin
      .from('time_off_types')
      .select('id, name, color, deducts_balance, is_active')
      .eq('tenant_id', tenantId)
      .order('name'),
  ])

  console.log('TIMEOFF DEBUG - tenantId:', tenantId, 'pending count:', pendingResult.data?.length, 'error:', pendingResult.error?.message)

  return (
    <AdminTimeOffClient
      tab={tab}
      pending={(pendingResult.data ?? []) as unknown as Parameters<typeof AdminTimeOffClient>[0]['pending']}
      history={(allResult.data ?? []) as unknown as Parameters<typeof AdminTimeOffClient>[0]['history']}
      holidays={(holidaysResult.data ?? []) as unknown as Parameters<typeof AdminTimeOffClient>[0]['holidays']}
      policies={(policiesResult.data ?? []) as unknown as Parameters<typeof AdminTimeOffClient>[0]['policies']}
      types={(typesResult.data ?? []) as unknown as Parameters<typeof AdminTimeOffClient>[0]['types']}
      tenantId={tenantId}
    />
  )
}
