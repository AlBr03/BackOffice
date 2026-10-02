import 'server-only'
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { mergeDropdownSettings } from '@/lib/dropdown-settings'

export const loadDropdownSettings = cache(async () => {
  const supabase = await createClient()
  const { data, error } = await supabase.from('dropdown_settings').select('options, version').eq('id', 1).single()
  return { settings: mergeDropdownSettings(data?.options), version: data?.version ?? 0, error }
})
