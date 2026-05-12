export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
// Full types will be generated via: npx supabase gen types typescript

export type UserRole = 'employee' | 'manager' | 'hr_admin' | 'tenant_admin' | 'super_admin'

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed'

export interface UserProfile {
  id: string
  tenant_id: string
  team_id: string | null
  email: string
  full_name: string
  avatar_url: string | null
  role: UserRole
  job_title: string | null
  hire_date: string | null
  onboarding_status: OnboardingStatus
  tenant_name: string
}
