import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('onboarding_status, tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile || profile.onboarding_status !== 'not_started') {
    return NextResponse.json({ ok: true })
  }

  await admin
    .from('users')
    .update({ onboarding_status: 'in_progress', updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ ok: true })
}
