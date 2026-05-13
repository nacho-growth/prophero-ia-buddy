import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthContext } from '@/lib/supabase/auth-context'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) return NextResponse.json([], { status: 401 })

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const tenantId = searchParams.get('tenantId')

  if (!userId || !tenantId) return NextResponse.json([])

  if (userId !== auth.userId) return NextResponse.json([], { status: 403 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('notifications')
    .select('id, title, body, notification_type, icon, is_read, created_at, deep_link, event_type')
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) console.error('NOTIFICATIONS GET error:', error)

  const mapped = (data ?? []).map(n => ({
    ...n,
    type: n.notification_type ?? 'info',
  }))

  return NextResponse.json(mapped)
}
