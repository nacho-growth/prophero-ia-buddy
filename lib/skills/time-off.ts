import { createAdminClient } from '@/lib/supabase/admin'

export async function isTimeOffEnabled(tenantId: string): Promise<boolean> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('tenant_skills')
    .select('skills(slug)')
    .eq('tenant_id', tenantId)
    .eq('is_enabled', true)
  if (!data) return false
  return data.some(row => (row.skills as unknown as { slug: string } | null)?.slug === 'time_off')
}
