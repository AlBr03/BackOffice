import Link from 'next/link'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadPersonalSettings } from '@/lib/business-settings-server'
import { PersonalSettingsEditor } from '@/components/personal-settings-editor'

export default async function PreferencesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { settings, error } = await loadPersonalSettings(user.id)
  const mode = (await cookies()).get('ui-mode')?.value
  if (mode === 'light' || mode === 'dark') settings.mode = mode
  return <div className="ui-stack"><section className="ui-card"><h1 className="ui-title">Mijn voorkeuren</h1><p className="ui-text-muted" style={{ marginTop: 12 }}>Stel je persoonlijke dashboard, weergave en notificaties in.</p><Link href="/dashboard" className="ui-link-button" style={{ marginTop: 12 }}>Terug naar dashboard</Link></section>{error ? <div className="ui-message ui-message-error">Voer eerst de databasemigratie voor bedrijfsinstellingen en persoonlijke voorkeuren uit.</div> : <PersonalSettingsEditor initialSettings={settings} />}</div>
}
