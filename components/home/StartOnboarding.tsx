'use client'

import { useEffect } from 'react'

export default function StartOnboarding() {
  useEffect(() => {
    void fetch('/api/user/start-onboarding', { method: 'POST' })
  }, [])

  return null
}
