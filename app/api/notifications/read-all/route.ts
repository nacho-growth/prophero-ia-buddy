import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthContext } from '@/lib/supabase/auth-context'

export async function POST(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await request.json().catch(() => null) as { userId?: string; tenantId?: string } | null
  const { userId, tenantId } = body ?? {}

  if (!userId || !tenantId) return NextResponse.json({ ok: false }, { status: 400 })

  if (userId !== auth.userId) return NextResponse.json({ ok: false }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('is_read', false)

  if (error) console.error('NOTIFICATIONS read-all error:', error)

  return NextResponse.json({ ok: true })
}
