import { FileText } from 'lucide-react'

interface Document {
  id: string
  title: string | null
  source_type: string | null
  status: string | null
  indexed_at: string | null
  created_at: string
  team_id: string | null
}

const SOURCE_LABELS: Record<string, string> = {
  upload:     'Subido',
  url:        'URL',
  google_doc: 'Google Doc',
  notion:     'Notion',
}

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  indexed:    { label: 'Indexado',    bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  processing: { label: 'Procesando', bg: 'rgba(251,191,36,0.12)', color: '#d97706' },
  error:      { label: 'Error',       bg: '#fef2f2',               color: '#ef4444' },
  pending:    { label: 'Pendiente',   bg: 'var(--bg-elevated)',    color: 'var(--text-muted)' },
}

function formatDate(date: string | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function DocumentsTab({ documents }: { documents: Document[] }) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
        <FileText size={36} style={{ opacity: 0.3 }} />
        <p className="text-sm">No hay documentos indexados en el knowledge base.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        {documents.length} documento{documents.length !== 1 ? 's' : ''} en el knowledge base
      </p>
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              {['Documento', 'Tipo', 'Estado', 'Indexado'].map(h => (
                <th
                  key={h}
                  className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {documents.map((doc, i) => {
              const statusCfg = STATUS_CONFIG[doc.status ?? ''] ?? STATUS_CONFIG.pending
              return (
                <tr
                  key={doc.id}
                  style={{ borderTop: i === 0 ? undefined : '1px solid var(--border-subtle)' }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {doc.title ?? 'Sin título'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
                    >
                      {SOURCE_LABELS[doc.source_type ?? ''] ?? doc.source_type ?? '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ background: statusCfg.bg, color: statusCfg.color }}
                    >
                      {statusCfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {formatDate(doc.indexed_at ?? doc.created_at)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
