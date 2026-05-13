'use client'

import { useEffect } from 'react'

export default function ScrollToStep() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#step-')) return
    const stepId = hash.replace('#step-', '')

    const raf = requestAnimationFrame(() => {
      const el = document.getElementById(`step-${stepId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.outline = '2px solid var(--accent)'
        setTimeout(() => { el.style.outline = '' }, 2000)
      }
    })

    return () => cancelAnimationFrame(raf)
  }, [])
  return null
}
