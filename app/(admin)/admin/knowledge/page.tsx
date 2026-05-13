import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ContentTab, { type StepWithContent } from '@/components/admin/knowledge/ContentTab'
import DocumentsTab from '@/components/admin/knowledge/DocumentsTab'
import GapsTab from '@/components/admin/knowledge/GapsTab'

interface Document {
  id: string
  title: string | null
  source_type: string | null
  status: string | null
  indexed_at: string | null
  created_at: string
  team_id: string | null
}

interface Gap {
  id: string
  question: string
  frequency: number | null
  status: string | null
  created_at: string
  team_id: string | null
}

const TABS = [
  { key: 'content',   label: 'Contenido'   },
  { key: 'documents', label: 'Documentos'  },
  { key: 'gaps',      label: 'Gaps'        },
]

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab = 'content' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: adminProfile } = await supabase
    .from('users')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!adminProfile) redirect('/login')
  const tenantId = adminProfile.tenant_id as string

  const admin = createAdminClient()

  const [stepsResult, documentsResult, gapsResult] = await Promise.all([
    admin
      .from('onboarding_steps')
      .select('id, title, type, step_order, content')
      .eq('tenant_id', tenantId)
      .order('step_order'),

    admin
      .from('knowledge_documents')
      .select('id, title, source_type, status, indexed_at, created_at, team_id')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false }),

    admin
      .from('knowledge_gaps')
      .select('id, question, frequency, status, created_at, team_id')
      .eq('tenant_id', tenantId)
      .order('frequency', { ascending: false }),
  ])

  const steps = (stepsResult.data ?? []) as unknown as StepWithContent[]
  const documents = (documentsResult.data ?? []) as unknown as Document[]
  const gaps = (gapsResult.data ?? []) as unknown as Gap[]

  const openGaps = gaps.filter(g => g.status === 'open' || g.status === 'in_progress').length

  const tabCounts: Record<string, number> = {
    content:   steps.length,
    documents: documents.length,
    gaps:      openGaps,
  }

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      {/* Header */}
      <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
        Conocimiento
      </h1>

      {/* Tab bar */}
      <div
        className="flex gap-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {TABS.map(t => {
          const isActive = tab === t.key
          const count = tabCounts[t.key]
          return (
            <Link
              key={t.key}
              href={`?tab=${t.key}`}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors"
              style={isActive ? {
                color: 'var(--accent)',
                borderBottom: '2px solid var(--accent)',
                marginBottom: -1,
              } : {
                color: 'var(--text-secondary)',
              }}
            >
              {t.label}
              {count > 0 && (
                <span
                  className="text-xs px-1.5 py-0.5 rounded-full"
                  style={isActive
                    ? { background: 'var(--accent-dim)', color: 'var(--accent)' }
                    : { background: 'var(--bg-elevated)', color: 'var(--text-muted)' }}
                >
                  {count}
                </span>
              )}
            </Link>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'content'   && <ContentTab   steps={steps} />}
      {tab === 'documents' && <DocumentsTab documents={documents} />}
      {tab === 'gaps'      && <GapsTab      gaps={gaps} />}
    </div>
  )
}
