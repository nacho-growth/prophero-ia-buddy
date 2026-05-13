'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function AuthCallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        subscription.unsubscribe()
        const hash = window.location.hash
        if (hash.includes('type=invite')) {
          router.replace('/set-password')
        } else {
          router.replace('/app/home')
        }
      }
    })

    return () => subscription.unsubscribe()
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
