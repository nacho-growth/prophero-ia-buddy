import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  reportsTo: z.string().min(1).nullable(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  const { data: inviter } = await admin
    .from('users')
    .select('role')
    .eq('id', auth.userId)
    .eq('tenant_id', auth.tenantId)
    .single()

  const allowedRoles = ['hr_admin', 'tenant_admin', 'super_admin']
  if (!allowedRoles.includes((inviter as { role: string } | null)?.role ?? '')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: employeeId } = await params

  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Invalid' }, { status: 400 })

  const { error } = await admin
    .from('users')
    .update({ reports_to: parsed.data.reportsTo, updated_at: new Date().toISOString() })
    .eq('id', employeeId)
    .eq('tenant_id', auth.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
