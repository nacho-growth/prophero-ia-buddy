import { Construction } from 'lucide-react'

interface Props {
  title: string
  description?: string
}

export default function ComingSoon({ title, description }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-32 gap-4">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: 'var(--accent-dim)', border: '1px solid rgba(45,91,227,0.2)' }}
      >
        <Construction size={26} style={{ color: 'var(--accent)' }} />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          {description ?? 'Esta sección está en desarrollo. Próximamente disponible.'}
        </p>
      </div>
    </div>
  )
}
