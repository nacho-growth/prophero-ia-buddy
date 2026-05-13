import { redirect } from 'next/navigation'
import { Trophy, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HomeWelcomeCard from '@/components/home/HomeWelcomeCard'
import HomeActiveOnboarding from '@/components/home/HomeActiveOnboarding'
import HomeQuickActions from '@/components/home/HomeQuickActions'
import HomeXPCard from '@/components/home/HomeXPCard'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const userId = user.id

  const { data: profile } = await supabase
    .from('users')
    .select('id, full_name, tenant_id, hire_date, onboarding_status, job_title, tenants(name)')
    .eq('id', userId)
    .single()

  if (!profile) redirect('/login')

  const tenantId = profile.tenant_id as string
  const tenantName = (profile.tenants as unknown as { name: string } | null)?.name ?? ''

  const today = new Date().toISOString().split('T')[0]

  const [
    empProfileResult,
    nextStepResult,
    notificationsResult,
    todayXPResult,
    totalStepsResult,
    completedStepsResult,
  ] = await Promise.all([
    supabase
      .from('employee_profiles')
      .select('onboarding_day, xp_total, current_level, last_sentiment')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle(),
    supabase
      .from('user_onboarding_progress')
      .select('*, onboarding_steps(*)')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('notifications')
      .select('id, title, body, type, is_read, created_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('xp_events')
      .select('xp_amount')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .gte('created_at', today),
    supabase
      .from('user_onboarding_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId),
    supabase
      .from('user_onboarding_progress')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('status', 'completed'),
  ])

  interface Step { id: string; title: string; description: string | null; step_order: number }

  const empProfile = empProfileResult.data
  const rawNextStep = nextStepResult.data
  const nextStep = rawNextStep?.onboarding_steps
    ? {
        ...(rawNextStep.onboarding_steps as Record<string, unknown>),
        step_order: (rawNextStep.onboarding_steps as { step_order: number }).step_order,
      } as Step
    : null
  const notifications = notificationsResult.data ?? []
  const todayXP = (todayXPResult.data ?? []).reduce((sum, row) => {
    const amount = (row as { xp_amount: number }).xp_amount
    return sum + (amount ?? 0)
  }, 0)
  const totalSteps = totalStepsResult.count ?? 0
  const completedSteps = completedStepsResult.count ?? 0

  const status = profile.onboarding_status as string

  if (status === 'completed') {
    const firstName = (profile.full_name as string).split(' ')[0]
    return (
      <div className="flex flex-col gap-6 max-w-xl mx-auto text-center py-8">
        <Trophy size={52} className="mx-auto" style={{ color: '#f59e0b' }} />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            ¡Felicitaciones, {firstName}!
          </h1>
          <p className="text-base mt-2" style={{ color: 'var(--text-muted)' }}>
            Completaste tu onboarding en {tenantName}. Ya eres parte del equipo.
          </p>
        </div>
        <div className="flex justify-center gap-8">
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {(empProfile?.xp_total ?? 0).toLocaleString('es')}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>XP ganados</p>
          </div>
          <div>
            <p className="text-2xl font-bold capitalize" style={{ color: 'var(--text-primary)' }}>
              {empProfile?.current_level ?? 'junior'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nivel alcanzado</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{completedSteps}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Pasos completados</p>
          </div>
        </div>
        <Link
          href="/app/chat"
          className="inline-flex items-center gap-2 mx-auto rounded-xl px-6 py-2.5 font-semibold text-sm"
          style={{ background: 'var(--accent)', color: '#fff' }}
        >
          <MessageCircle size={16} />
          Seguir aprendiendo con IA Buddy
        </Link>
        <div className="mt-4">
          <HomeXPCard xpTotal={empProfile?.xp_total ?? 0} currentLevel={empProfile?.current_level ?? 'junior'} />
        </div>
        <HomeQuickActions />
      </div>
    )
  }

  if (status === 'not_started' || !status) {
    return (
      <div className="flex flex-col gap-6">
        <HomeWelcomeCard
          name={profile.full_name as string}
          tenantName={tenantName}
          jobTitle={profile.job_title as string | null}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Primeros pasos</h2>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>1.</span>
                Presenta tu primer mensaje al asistente IA
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>2.</span>
                Revisa tu plan de onboarding personalizado
              </li>
              <li className="flex items-start gap-2">
                <span style={{ color: 'var(--accent)' }}>3.</span>
                Conoce a tu equipo y tus primeras tareas
              </li>
            </ul>
          </div>
          <HomeQuickActions />
        </div>
      </div>
    )
  }

  return (
    <HomeActiveOnboarding
      name={profile.full_name as string}
      empProfile={empProfile}
      nextStep={nextStep}
      notifications={notifications}
      completedSteps={completedSteps}
      totalSteps={totalSteps}
      todayXP={todayXP}
    />
  )
}
