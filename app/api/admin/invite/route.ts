import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'
import { isTimeOffEnabled } from '@/lib/skills/time-off'

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(100),
  teamId: z.string().min(1),
  role: z.enum(['employee', 'manager', 'hr_admin', 'tenant_admin']),
  jobTitle: z.string().max(100).optional(),
  reportsTo: z.string().min(1).optional(),
  requestEmail: z.string().email().optional(),
})

export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse body first — role check below needs parsed.data
  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('INVITE - validation error:', parsed.error.issues)
    return NextResponse.json({ error: 'Invalid', details: parsed.error.issues }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: inviter } = await admin
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .eq('tenant_id', auth.tenantId)
    .single()

  const inviterRole = (inviter as { role: string } | null)?.role ?? ''
  const allowedRoles = ['manager', 'hr_admin', 'tenant_admin', 'super_admin']

  if (!allowedRoles.includes(inviterRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (inviterRole === 'manager' && ['tenant_admin', 'hr_admin'].includes(parsed.data.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, fullName, teamId, role, jobTitle, reportsTo } = parsed.data

  const { data: team } = await admin
    .from('teams')
    .select('id, name')
    .eq('id', teamId)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 })

  const { data: track } = await admin
    .from('onboarding_tracks')
    .select('id, name')
    .eq('team_id', teamId)
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .maybeSingle()

  const { data: authUser, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      full_name: fullName,
      role,
      team_id: teamId,
      tenant_id: auth.tenantId,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://prophero-ia-buddy.vercel.app'}/auth/callback`,
  })

  if (inviteError) {
    console.error('INVITE ERROR:', inviteError)
    return NextResponse.json({ error: inviteError.message }, { status: 400 })
  }

  if (jobTitle || reportsTo) {
    await admin
      .from('users')
      .update({
        ...(jobTitle ? { job_title: jobTitle } : {}),
        ...(reportsTo ? { reports_to: reportsTo } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.user.id)
  }

  if (track) {
    const { data: steps } = await admin
      .from('onboarding_steps')
      .select('id')
      .eq('track_id', (track as { id: string }).id)
      .eq('tenant_id', auth.tenantId)

    if (steps?.length) {
      await admin.from('user_onboarding_progress').insert(
        steps.map(s => ({
          user_id: authUser.user.id,
          tenant_id: auth.tenantId,
          track_id: (track as { id: string }).id,
          step_id: s.id,
          status: 'pending',
        }))
      )
    }
  }

  const timeOffActive = await isTimeOffEnabled(auth.tenantId)
  if (timeOffActive) {
    const { data: defaultPolicy } = await admin
      .from('time_off_policies')
      .select('id, days_per_year')
      .eq('tenant_id', auth.tenantId)
      .eq('is_default', true)
      .maybeSingle()

    if (defaultPolicy) {
      await admin.from('time_off_balances').insert({
        user_id:      authUser.user.id,
        tenant_id:    auth.tenantId,
        policy_id:    defaultPolicy.id,
        year:         new Date().getFullYear(),
        days_total:   defaultPolicy.days_per_year,
        days_used:    0,
        days_pending: 0,
      })
      console.log('INVITE - time off balance created:', defaultPolicy.days_per_year, 'days')
    }
  }

  if (parsed.data.requestEmail) {
    await admin
      .from('access_requests')
      .update({ status: 'invited', updated_at: new Date().toISOString() })
      .eq('email', parsed.data.requestEmail)
      .eq('status', 'pending')
  }

  console.log('INVITE SUCCESS - user:', authUser.user.id, 'team:', (team as { name: string }).name, 'track:', (track as { name: string } | null)?.name ?? 'none')
  return NextResponse.json({ ok: true, userId: authUser.user.id, hasTrack: !!track })
}
