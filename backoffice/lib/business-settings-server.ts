import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { defaultPersonalSettings, mergeBusinessSettings, validatePersonalSettings } from '@/lib/business-settings'

export const loadBusinessSettings = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('business_settings').select('settings, version').eq('id', 1).single()
  if (error) {
    const { data: publicSettings } = await supabase.rpc('public_business_details')
    return { settings: mergeBusinessSettings(publicSettings), version: 0, error }
  }
  return { settings: mergeBusinessSettings(data?.settings), version: data?.version ?? 0, error }
})

export const loadPersonalSettings = cache(async (userId: string) => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('user_preferences').select('preferences').eq('user_id', userId).maybeSingle()
  let settings = defaultPersonalSettings()
  if (data) { try { settings = validatePersonalSettings(data.preferences) } catch { /* Defaults remain usable after an upgrade. */ } }
  return { settings, error }
})

// Cron and customer-triggered transactional mail have no employee session.
export const loadBusinessSettingsForSystem = cache(async () => {
  const { data, error } = await createAdminClient().from('business_settings').select('settings, version').eq('id', 1).single()
  return { settings: mergeBusinessSettings(data?.settings), version: data?.version ?? 0, error }
})
