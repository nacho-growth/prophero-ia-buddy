import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  console.log('=== ROUTE HIT ===', request.url)
  try {
    const auth = await getAuthContext()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('conversations')
      .select('id, title, created_at, updated_at')
      .eq('tenant_id', auth.tenantId)
      .eq('user_id', auth.userId)
      .order('updated_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('=== ROUTE ERROR ===', error)
      return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 })
    }

    return NextResponse.json({ conversations: data ?? [] })
  } catch (e) {
    console.error('=== ROUTE ERROR ===', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
