import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthContext } from '@/lib/supabase/auth-context'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('id', id)
    .eq('user_id', auth.userId)
    .eq('tenant_id', auth.tenantId)

  if (error) console.error('NOTIFICATIONS read error:', error)

  return NextResponse.json({ ok: true })
}
