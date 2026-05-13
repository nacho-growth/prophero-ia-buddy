import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/admin'

const schema = z.object({
  email: z.string().email(),
  message: z.string().max(500).optional(),
})

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    console.error('REQUEST ACCESS - validation error:', parsed.error.issues)
    return NextResponse.json({ error: 'Invalid' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('access_requests').insert({
    email: parsed.data.email,
    message: parsed.data.message ?? null,
    status: 'pending',
  })

  if (error) {
    console.error('REQUEST ACCESS - insert error:', error)
    return NextResponse.json({ error: 'Error al guardar la solicitud' }, { status: 500 })
  }

  console.log('ACCESS REQUEST - email:', parsed.data.email)
  return NextResponse.json({ ok: true })
}
