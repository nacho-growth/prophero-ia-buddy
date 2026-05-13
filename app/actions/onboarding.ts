'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

export async function completeStep(progressId: string, userId: string, tenantId: string) {
  const admin = createAdminClient()

  const { error: updateError } = await admin
    .from('user_onboarding_progress')
    .update({ status: 'completed', completed_at: new Date().toISOString() })
    .eq('id', progressId)
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)

  if (updateError) {
    console.error('completeStep update error:', updateError)
    throw new Error('No se pudo completar el paso')
  }

  const { count, error: countError } = await admin
    .from('user_onboarding_progress')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('tenant_id', tenantId)
    .eq('status', 'pending')

  if (countError) {
    console.error('completeStep count error:', countError)
  }

  if (count === 0) {
    const { error: onboardingError } = await admin
      .from('users')
      .update({ onboarding_status: 'completed', onboarding_completed_at: new Date().toISOString() })
      .eq('id', userId)
      .eq('tenant_id', tenantId)

    if (onboardingError) {
      console.error('completeStep onboarding_status update error:', onboardingError)
    }
  }

  const { error: xpInsertError } = await admin.from('xp_events').insert({
    user_id: userId,
    tenant_id: tenantId,
    xp_amount: 50,
    reason: 'onboarding_step_completed',
    reference_type: 'onboarding_steps',
  })

  if (xpInsertError) {
    console.error('completeStep xp_events insert error:', xpInsertError)
  }

  const { error: rpcError } = await admin.rpc('increment_xp', {
    p_user_id: userId,
    p_tenant_id: tenantId,
    p_amount: 50,
  })

  if (rpcError) {
    console.error('completeStep increment_xp rpc error (falling back to manual update):', rpcError)

    const { data: ep, error: epReadError } = await admin
      .from('employee_profiles')
      .select('xp_total')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .single()

    if (epReadError) {
      console.error('completeStep employee_profiles read error:', epReadError)
    } else if (ep) {
      const { error: epUpdateError } = await admin
        .from('employee_profiles')
        .update({ xp_total: ((ep as { xp_total: number }).xp_total ?? 0) + 50 })
        .eq('user_id', userId)
        .eq('tenant_id', tenantId)

      if (epUpdateError) {
        console.error('completeStep employee_profiles update error:', epUpdateError)
      }
    }
  }

  revalidatePath('/app/journey')
  revalidatePath('/app/home')
}
