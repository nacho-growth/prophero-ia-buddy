import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await getAuthContext()
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const conversationId = request.nextUrl.searchParams.get('conversationId')
  if (!conversationId) {
    return NextResponse.json({ error: 'conversationId required' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Verify conversation belongs to this user + tenant
  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('id', conversationId)
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .single()

  if (!conv) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('messages')
    .select('id, role, content, created_at')
    .eq('conversation_id', conversationId)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }

  return NextResponse.json({ messages: data ?? [] })
}
