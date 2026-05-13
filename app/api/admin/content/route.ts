import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_ROLES = ['manager', 'hr_admin', 'tenant_admin', 'super_admin']

export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const stepId = request.nextUrl.searchParams.get('stepId')
  if (!stepId) return NextResponse.json({ error: 'stepId required' }, { status: 400 })

  const admin = createAdminClient()

  const { data: userProfile } = await admin
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (!ALLOWED_ROLES.includes((userProfile as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: step } = await admin
    .from('onboarding_steps')
    .select('content')
    .eq('id', stepId)
    .eq('tenant_id', auth.tenantId)
    .single()

  const content = step?.content as { generated_reading?: string; reading_status?: string } | null
  return NextResponse.json({
    content: content?.generated_reading ?? null,
    status: content?.reading_status ?? null,
  })
}
