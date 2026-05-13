import HomeProgressCard from './HomeProgressCard'
import HomeXPCard from './HomeXPCard'
import HomeCheckinCard from './HomeCheckinCard'
import HomeNextStepCard from './HomeNextStepCard'
import HomeNotifications from './HomeNotifications'
import HomeQuickActions from './HomeQuickActions'

interface EmpProfile {
  onboarding_day: number | null
  xp_total: number | null
  current_level: string | null
  last_sentiment: string | null
}

interface Step {
  id: string
  title: string
  description: string | null
  step_order: number
}

interface Notification {
  id: string
  title: string
  body: string | null
  type: string | null
  is_read: boolean
  created_at: string
}

interface Props {
  name: string
  empProfile: EmpProfile | null
  nextStep: Step | null
  notifications: Notification[]
  completedSteps: number
  totalSteps: number
  todayXP: number
}

export default function HomeActiveOnboarding({
  name,
  empProfile,
  nextStep,
  notifications,
  completedSteps,
  totalSteps,
  todayXP,
}: Props) {
  const firstName = name.split(' ')[0]
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {greeting}, {firstName}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
          Día {empProfile?.onboarding_day ?? 1} de tu onboarding
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <HomeProgressCard
          onboardingDay={empProfile?.onboarding_day ?? 1}
          completedSteps={completedSteps}
          totalSteps={totalSteps}
          todayXP={todayXP}
        />
        <HomeXPCard
          xpTotal={empProfile?.xp_total ?? 0}
          currentLevel={empProfile?.current_level ?? 'junior'}
        />
        <HomeCheckinCard lastSentiment={empProfile?.last_sentiment ?? null} />
        <HomeNextStepCard step={nextStep} />
        <HomeNotifications notifications={notifications} />
        <HomeQuickActions />
      </div>
    </div>
  )
}
