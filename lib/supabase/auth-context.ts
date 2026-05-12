import { createClient } from './server'

export interface AuthContext {
  userId: string
  tenantId: string
}

export async function getAuthContext(): Promise<AuthContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('getAuthContext error:', profileError)
      return null
    }

    return {
      userId: user.id,
      tenantId: profile.tenant_id as string,
    }
  } catch (error) {
    console.error('getAuthContext error:', error)
    return null
  }
}
