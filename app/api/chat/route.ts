import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthContext } from '@/lib/supabase/auth-context'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { callClaude } from '@/lib/ai/claude'

const schema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(4000),
  title: z.string().max(100).optional(),
})

export async function POST(request: NextRequest) {
  console.log('=== ROUTE HIT ===', request.url)
  try {
    const auth = await getAuthContext()
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseServer = await createClient()
    const { data: { user }, error: userError } = await supabaseServer.auth.getUser()
    if (!user || userError) return new Response('Unauthorized', { status: 401 })
    const accessToken = (await supabaseServer.auth.getSession()).data.session?.access_token ?? ''

    const body: unknown = await request.json().catch(() => null)
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const { message, title: bodyTitle } = parsed.data
    let { conversationId } = parsed.data
    const admin = createAdminClient()

    if (!conversationId) {
      const title = bodyTitle ?? (message.length > 60 ? message.slice(0, 60) + '…' : message)
      const { data: conv, error } = await admin
        .from('conversations')
        .insert({ tenant_id: auth.tenantId, user_id: auth.userId, title })
        .select('id')
        .single()

      if (error || !conv) {
        console.error('=== ROUTE ERROR === create conversation', error)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }
      conversationId = (conv as { id: string }).id
    }

    const { error: msgError } = await admin.from('messages').insert({
      conversation_id: conversationId,
      tenant_id: auth.tenantId,
      user_id: auth.userId,
      role: 'user',
      content: message,
    })
    if (msgError) console.error('=== MSG INSERT ERROR ===', JSON.stringify(msgError))

    const result = await callClaude({
      userId: auth.userId,
      tenantId: auth.tenantId,
      conversationId,
      userMessage: message,
      accessToken,
    })

    if (!result.ok) {
      console.error('=== ROUTE ERROR === callClaude', result.error)
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json(result.data)
  } catch (e) {
    console.error('=== ROUTE ERROR ===', e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 })
  }
}
