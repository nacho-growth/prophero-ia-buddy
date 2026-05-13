import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  requestId: z.string().min(1),
  action:    z.enum(['approve', 'reject']),
  comment:   z.string().max(500).optional(),
})

const ROLE_RANK: Record<string, number> = {
  employee: 0, manager: 1, hr_admin: 2, tenant_admin: 3, super_admin: 4,
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('TIME-OFF REVIEW - validation error:', parsed.error.issues)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { requestId, action, comment } = parsed.data
  const admin = createAdminClient()

  // Verify reviewer is manager+
  const { data: reviewer } = await admin
    .from('users')
    .select('role, tenant_id')
    .eq('id', user.id)
    .single()
  if (!reviewer || (ROLE_RANK[reviewer.role] ?? -1) < ROLE_RANK.manager) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const tenantId = reviewer.tenant_id as string

  // Fetch the request + its type
  const { data: req } = await admin
    .from('time_off_requests')
    .select('id, user_id, days_count, status, type_id, time_off_types(deducts_balance, name)')
    .eq('id', requestId)
    .eq('tenant_id', tenantId)
    .single()

  if (!req) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (req.status !== 'pending') {
    return NextResponse.json({ error: 'La solicitud ya fue procesada' }, { status: 400 })
  }

  const employeeId  = req.user_id as string
  const daysCount   = req.days_count as number
  const deducts     = (req.time_off_types as unknown as { deducts_balance: boolean; name: string } | null)?.deducts_balance ?? false
  const typeName    = (req.time_off_types as unknown as { deducts_balance: boolean; name: string } | null)?.name ?? 'tiempo libre'
  const currentYear = new Date().getFullYear()

  if (action === 'approve') {
    await admin
      .from('time_off_requests')
      .update({ status: 'approved', reviewed_by: user.id, reviewed_at: new Date().toISOString() })
      .eq('id', requestId)

    if (deducts) {
      const { data: bal } = await admin
        .from('time_off_balances')
        .select('days_used, days_pending')
        .eq('user_id', employeeId)
        .eq('tenant_id', tenantId)
        .eq('year', currentYear)
        .maybeSingle()

      if (bal) {
        await admin
          .from('time_off_balances')
          .update({
            days_used:    (bal.days_used as number) + daysCount,
            days_pending: Math.max(0, (bal.days_pending as number) - daysCount),
          })
          .eq('user_id', employeeId)
          .eq('tenant_id', tenantId)
          .eq('year', currentYear)
      }
    }

    await admin.from('notifications').insert({
      user_id:           employeeId,
      tenant_id:         tenantId,
      title:             `Solicitud de ${typeName} aprobada ✓`,
      body:              `Tu solicitud de ${daysCount} día${daysCount !== 1 ? 's' : ''} fue aprobada.`,
      notification_type: 'time_off_review',
      deep_link:         '/app/tiempo',
      is_read:           false,
    })

  } else {
    await admin
      .from('time_off_requests')
      .update({
        status:         'rejected',
        review_comment: comment ?? null,
        reviewed_by:    user.id,
        reviewed_at:    new Date().toISOString(),
      })
      .eq('id', requestId)

    if (deducts) {
      const { data: bal } = await admin
        .from('time_off_balances')
        .select('days_pending')
        .eq('user_id', employeeId)
        .eq('tenant_id', tenantId)
        .eq('year', currentYear)
        .maybeSingle()

      if (bal) {
        await admin
          .from('time_off_balances')
          .update({ days_pending: Math.max(0, (bal.days_pending as number) - daysCount) })
          .eq('user_id', employeeId)
          .eq('tenant_id', tenantId)
          .eq('year', currentYear)
      }
    }

    await admin.from('notifications').insert({
      user_id:           employeeId,
      tenant_id:         tenantId,
      title:             `Solicitud de ${typeName} rechazada`,
      body:              comment
        ? `Tu solicitud fue rechazada: ${comment}`
        : `Tu solicitud de ${daysCount} día${daysCount !== 1 ? 's' : ''} fue rechazada.`,
      notification_type: 'time_off_review',
      deep_link:         '/app/tiempo',
      is_read:           false,
    })
  }

  console.log('TIME-OFF REVIEW - requestId:', requestId, 'action:', action, 'reviewer:', user.id)
  return NextResponse.json({ ok: true })
}
