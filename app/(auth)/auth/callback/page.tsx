'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash
    const params = new URLSearchParams(hash.slice(1))
    const accessToken  = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const isInvite     = params.get('type') === 'invite'

    const supabase = createClient()

    async function handleCallback() {
      if (accessToken && refreshToken) {
        // @supabase/ssr no procesa el hash automáticamente — setSession manual
        const { error } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        })
        if (error) {
          router.replace('/login?error=auth_callback_failed')
          return
        }
      } else {
        // Fallback para otros flows (magic link con code, OAuth, etc.)
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error || !session) {
          router.replace('/login?error=auth_callback_failed')
          return
        }
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
