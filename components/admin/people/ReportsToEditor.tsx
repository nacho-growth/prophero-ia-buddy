'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Loader2, Check, X } from 'lucide-react'

interface Manager { id: string; full_name: string; job_title: string | null; role: string }

interface Props {
  employeeId: string
  currentReportsToId: string | null
}

const ROLE_LABEL: Record<string, string> = {
  manager: 'Manager', hr_admin: 'HR Admin', tenant_admin: 'Admin',
}

export default function ReportsToEditor({ employeeId, currentReportsToId }: Props) {
  const router = useRouter()
  const [managers, setManagers] = useState<Manager[]>([])
  const [editing, setEditing] = useState(false)
  const [selected, setSelected] = useState(currentReportsToId ?? '')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users')
      .then(r => r.json())
      .then((d: { users: Manager[] }) => setManagers(d.users ?? []))
      .catch(() => {})
  }, [])

  const currentName = managers.find(m => m.id === currentReportsToId)?.full_name

  async function handleSave() {
    setLoading(true)
    try {
      await fetch(`/api/admin/people/${employeeId}/reports-to`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportsTo: selected || null }),
      })
      setEditing(false)
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (editing) {
    return (
      <span className="flex items-center gap-2">
        <select
          value={selected}
          onChange={e => setSelected(e.target.value)}
          className="rounded-lg px-2 py-1 text-xs focus:outline-none cursor-pointer"
          style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
        >
          <option value="">Sin asignar (aprueba tenant admin)</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>
              {m.full_name}{m.job_title ? ` — ${m.job_title}` : ''} ({ROLE_LABEL[m.role] ?? m.role})
            </option>
          ))}
        </select>
        <button
          onClick={handleSave}
          disabled={loading}
          className="cursor-pointer flex items-center gap-1 text-xs px-2 py-1 rounded-lg disabled:opacity-40"
          style={{ background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}
        >
          {loading ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
        </button>
        <button
          onClick={() => { setEditing(false); setSelected(currentReportsToId ?? '') }}
          className="cursor-pointer text-xs px-2 py-1 rounded-lg"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
        >
          <X size={11} />
        </button>
      </span>
    )
  }

  return (
    <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
      Reporta a: <span style={{ color: 'var(--text-secondary)' }}>{currentName ?? '—'}</span>
      <button
        onClick={() => setEditing(true)}
        className="cursor-pointer hover:opacity-70 transition-opacity"
        style={{ color: 'var(--text-muted)' }}
      >
        <Pencil size={12} />
      </button>
    </span>
  )
}
