import { redirect } from 'next/navigation'
import { PersonalSettingsEditor } from '@/components/personal-settings-editor'
import { SettingsShell } from '@/components/settings-shell'
import { createClient } from '@/lib/supabase/server'
import { loadPersonalSettings } from '@/lib/business-settings-server'

export default async function PersonalSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { settings, error } = await loadPersonalSettings(user.id)
  return <SettingsShell currentPath="/dashboard/settings/personal" title="Mijn voorkeuren" description="Kies welke notificaties je ontvangt en hoe jouw dashboard wordt weergegeven.">
    {error ? <div role="alert" className="ui-message ui-message-error">Voorkeuren kunnen niet worden geladen. Controleer de databasemigratie voor persoonlijke voorkeuren.</div> : <PersonalSettingsEditor initialSettings={settings} />}
  </SettingsShell>
}
