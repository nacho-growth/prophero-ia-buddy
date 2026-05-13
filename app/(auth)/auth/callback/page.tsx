'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    // Leer el hash ANTES de que Supabase lo procese y limpie la URL
    const hash = window.location.hash
    const isInvite = hash.includes('type=invite')

    const supabase = createClient()

    async function handleCallback() {
      // getSession() procesa el hash y establece la sesión
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        router.replace('/login?error=auth_callback_failed')
        return
      }

      router.replace(isInvite ? '/set-password' : '/app/home')
    }

    void handleCallback()
  }, [router])

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#0a0a0f' }}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className="w-8 h-8 border-2 rounded-full animate-spin"
          style={{ borderColor: '#2d5be3', borderTopColor: 'transparent' }}
        />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Verificando tu acceso...
        </p>
      </div>
    </div>
  )
}
