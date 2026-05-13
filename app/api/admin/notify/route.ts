import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  stepId: z.string().uuid(),
  message: z.string().min(1).max(500),
  audience: z.enum(['all', 'team']),
  teamId: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('NOTIFY - validation error:', parsed.error.issues)
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const { stepId, message, audience, teamId } = parsed.data
  const admin = createAdminClient()

  const { data: step } = await admin
    .from('onboarding_steps')
    .select('title')
    .eq('id', stepId)
    .eq('tenant_id', auth.tenantId)
    .single()

  let query = admin
    .from('users')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .is('deleted_at', null)
    .neq('id', auth.userId)

  if (audience === 'team' && teamId) {
    query = query.eq('team_id', teamId)
  }

  const { data: recipients } = await query

  if (!recipients?.length) {
    console.log('NOTIFY DEBUG - no recipients found')
    return NextResponse.json({ ok: true, sent: 0 })
  }

  const notifications = recipients.map(r => ({
    user_id: r.id,
    tenant_id: auth.tenantId,
    event_type: 'knowledge_doc_updated',
    title: `Material actualizado: ${step?.title ?? 'Paso de onboarding'}`,
    body: message,
    notification_type: 'info',
    icon: 'book-open',
    is_read: false,
    reference_id: stepId,
    reference_type: 'onboarding_steps',
    deep_link: `/app/journey#step-${stepId}`,
  }))

  const { error } = await admin.from('notifications').insert(notifications)

  console.log('NOTIFY DEBUG - sent to:', recipients.length, 'recipients, error:', error)

  return NextResponse.json({ ok: true, sent: recipients.length })
}
