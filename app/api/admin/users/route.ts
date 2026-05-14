import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const admin = createAdminClient()
  const { data } = await admin
    .from('users')
    .select('id, full_name, job_title, role')
    .eq('tenant_id', profile.tenant_id as string)
    .in('role', ['manager', 'hr_admin', 'tenant_admin'])
    .is('deleted_at', null)
    .order('full_name')

  return NextResponse.json({ users: data ?? [] })
}
