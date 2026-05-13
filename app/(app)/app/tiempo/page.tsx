import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTimeOffEnabled } from '@/lib/skills/time-off'
import TiempoPageClient, {
  type Balance,
  type TimeOffRequest,
  type PublicHoliday,
  type TimeOffType,
} from '@/components/time-off/TiempoPageClient'
import { Umbrella } from 'lucide-react'

export default async function TiempoPage() {
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
  const enabled = await isTimeOffEnabled(tenantId)

  if (!enabled) {
    return (
      <div className="flex flex-col items-center gap-3 py-20">
        <Umbrella size={36} style={{ opacity: 0.3, color: 'var(--text-muted)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Este módulo no está disponible para tu organización.
        </p>
      </div>
    )
  }

  const admin = createAdminClient()
  const currentYear = new Date().getFullYear()

  const [balanceResult, requestsResult, holidaysResult, typesResult] = await Promise.all([
    admin
      .from('time_off_balances')
      .select('days_total, days_used, days_pending, time_off_policies(name)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('year', currentYear)
      .maybeSingle(),

    admin
      .from('time_off_requests')
      .select('id, start_date, end_date, days_count, status, reason, review_comment, created_at, time_off_types(name, color)')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20),

    admin
      .from('public_holidays')
      .select('id, date, name, country_code')
      .eq('tenant_id', tenantId)
      .eq('year', currentYear)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date')
      .limit(10),

    admin
      .from('time_off_types')
      .select('id, name, color, deducts_balance')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name'),
  ])

  return (
    <TiempoPageClient
      balance={(balanceResult.data ?? null) as unknown as Balance | null}
      requests={(requestsResult.data ?? []) as unknown as TimeOffRequest[]}
      holidays={(holidaysResult.data ?? []) as PublicHoliday[]}
      types={(typesResult.data ?? []) as TimeOffType[]}
    />
  )
}
