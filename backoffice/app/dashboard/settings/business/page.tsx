import { redirect } from 'next/navigation'
import { SettingsShell } from '@/components/settings-shell'
import { BusinessSettingsEditor } from '@/components/business-settings-editor'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns } from '@/lib/dropdown-settings'
import { loadBusinessSettings } from '@/lib/business-settings-server'

export default async function BusinessSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canManageDropdowns(profile?.role)) redirect('/dashboard/settings')
  const [{ settings, version, error }, { data: stores }] = await Promise.all([loadBusinessSettings(), supabase.from('stores').select('id, name').order('name')])
  const initialSettings = { ...settings, stores: Object.fromEntries(Object.entries(settings.stores).filter(([id]) => (stores ?? []).some((store) => store.id === id))) }
  return <SettingsShell currentPath="/dashboard/settings/business" title="Bedrijfsinstellingen" description="Beheer bedrijfsgegevens, leveranciers, defaults, reminders, mails en verplichte velden.">
    {error ? <div className="ui-message ui-message-error">Voer eerst de databasemigratie voor bedrijfsinstellingen uit.</div> : <BusinessSettingsEditor initialSettings={initialSettings} initialVersion={version} stores={stores ?? []} />}
  </SettingsShell>
}
