import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  stepId: z.string().uuid(),
  content: z.string().optional(),
})

const ALLOWED_ROLES = ['manager', 'hr_admin', 'tenant_admin', 'super_admin']

export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

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

  const { stepId } = parsed.data

  const { data: step, error: fetchError } = await admin
    .from('onboarding_steps')
    .select('content')
    .eq('id', stepId)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (fetchError || !step) {
    return NextResponse.json({ error: 'Step not found' }, { status: 404 })
  }

  const updatedContent = {
    ...(step.content as object ?? {}),
    reading_status: 'published',
    ...(parsed.data.content ? { generated_reading: parsed.data.content } : {}),
  }

  const { error } = await admin
    .from('onboarding_steps')
    .update({ content: updatedContent })
    .eq('id', stepId)
    .eq('tenant_id', auth.tenantId)

  if (error) {
    console.error('PUBLISH ERROR:', error)
    return NextResponse.json({ error: 'Failed to publish' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
