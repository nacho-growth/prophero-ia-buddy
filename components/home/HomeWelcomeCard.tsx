import { Sparkles } from 'lucide-react'
import Link from 'next/link'

interface Props {
  name: string
  tenantName: string
  jobTitle: string | null
}

export default function HomeWelcomeCard({ name, tenantName, jobTitle }: Props) {
  const firstName = name.split(' ')[0]

  return (
    <div
      className="rounded-2xl p-8 flex flex-col gap-4"
      style={{ background: 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #000))', color: '#fff' }}
    >
      <div className="flex items-center gap-3">
        <Sparkles size={28} />
        <h1 className="text-2xl font-bold">
          ¡Bienvenido/a a {tenantName}, {firstName}!
        </h1>
      </div>
      <p className="text-base opacity-90 max-w-xl">
        {jobTitle ? `Como ${jobTitle}, estás comenzando` : 'Estás comenzando'} un gran camino.
        Tu Buddy está listo para acompañarte desde el primer día.
      </p>
      <div className="flex flex-wrap gap-3 mt-2">
        <Link
          href="/app/chat"
          className="rounded-xl px-5 py-2.5 font-semibold text-sm transition-opacity hover:opacity-90"
          style={{ background: '#fff', color: 'var(--accent)' }}
        >
          Hablar con IA Buddy
        </Link>
        <Link
          href="/app/journey"
          className="rounded-xl px-5 py-2.5 font-semibold text-sm border border-white/40 hover:bg-white/10 transition-colors"
          style={{ color: '#fff' }}
        >
          Ver plan de onboarding
        </Link>
      </div>
    </div>
  )
}
