import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTimeOffEnabled } from '@/lib/skills/time-off'

const schema = z.object({
  typeId:    z.string().min(1),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason:    z.string().max(500).optional(),
})

function calculateWorkingDays(start: string, end: string): number {
  let count = 0
  const current = new Date(start + 'T12:00:00')
  const endDate  = new Date(end   + 'T12:00:00')
  while (current <= endDate) {
    const day = current.getDay()
    if (day !== 0 && day !== 6) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('TIME-OFF REQUEST - validation error:', parsed.error.issues)
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  const { typeId, startDate, endDate, reason } = parsed.data
  if (endDate < startDate) {
    return NextResponse.json({ error: 'La fecha fin debe ser posterior al inicio' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('users')
    .select('tenant_id, team_id')
    .eq('id', user.id)
    .single()
  if (!profile) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const tenantId = profile.tenant_id as string

  const enabled = await isTimeOffEnabled(tenantId)
  if (!enabled) return NextResponse.json({ error: 'Módulo no habilitado' }, { status: 403 })

  // Get the type to check deducts_balance
  const { data: typeRow } = await admin
    .from('time_off_types')
    .select('id, name, deducts_balance')
    .eq('id', typeId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .single()
  if (!typeRow) return NextResponse.json({ error: 'Tipo de ausencia no válido' }, { status: 400 })

  const daysCount = calculateWorkingDays(startDate, endDate)
  if (daysCount === 0) return NextResponse.json({ error: 'El rango no incluye días hábiles' }, { status: 400 })

  const currentYear = new Date().getFullYear()

  // Check balance if type deducts
  if (typeRow.deducts_balance) {
    const { data: balance } = await admin
      .from('time_off_balances')
      .select('days_total, days_used, days_pending')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('year', currentYear)
      .maybeSingle()

    if (balance) {
      const available = balance.days_total - balance.days_used - balance.days_pending
      if (daysCount > available) {
        return NextResponse.json({ error: `Saldo insuficiente. Disponibles: ${available} días` }, { status: 400 })
      }
    }
  }

  // Insert request
  const { data: newRequest, error: insertError } = await admin
    .from('time_off_requests')
    .insert({
      user_id:    user.id,
      tenant_id:  tenantId,
      type_id:    typeId,
      start_date: startDate,
      end_date:   endDate,
      days_count: daysCount,
      reason:     reason ?? null,
      status:     'pending',
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('TIME-OFF REQUEST - insert error:', insertError)
    return NextResponse.json({ error: 'Error al crear solicitud' }, { status: 500 })
  }

  // Update pending balance
  if (typeRow.deducts_balance) {
    const { data: currentBal } = await admin
      .from('time_off_balances')
      .select('days_pending')
      .eq('user_id', user.id)
      .eq('tenant_id', tenantId)
      .eq('year', currentYear)
      .maybeSingle()

    if (currentBal) {
      await admin
        .from('time_off_balances')
        .update({ days_pending: (currentBal.days_pending as number) + daysCount })
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('year', currentYear)
    }
  }

  // Notify manager(s) of the team
  const teamId = profile.team_id as string | null
  if (teamId) {
    const { data: managers } = await admin
      .from('users')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('team_id', teamId)
      .in('role', ['manager', 'hr_admin', 'tenant_admin'])

    if (managers && managers.length > 0) {
      const { data: userRow } = await admin
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single()

      const notifications = managers.map(m => ({
        user_id:           m.id,
        tenant_id:         tenantId,
        title:             'Nueva solicitud de tiempo libre',
        body:              `${userRow?.full_name ?? 'Un empleado'} solicitó ${daysCount} día${daysCount !== 1 ? 's' : ''} de ${typeRow.name} (${startDate} → ${endDate})`,
        notification_type: 'time_off_request',
        deep_link:         '/admin/time-off',
        is_read:           false,
      }))

      await admin.from('notifications').insert(notifications)
    }
  }

  console.log('TIME-OFF REQUEST - created:', newRequest?.id, 'days:', daysCount)
  return NextResponse.json({ ok: true })
}
