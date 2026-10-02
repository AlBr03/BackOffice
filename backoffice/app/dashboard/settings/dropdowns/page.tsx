import { redirect } from 'next/navigation'
import { SettingsShell } from '@/components/settings-shell'
import { DropdownManagement } from '@/components/dropdown-management'
import { createClient } from '@/lib/supabase/server'
import { canManageDropdowns } from '@/lib/dropdown-settings'
import { loadDropdownSettings } from '@/lib/dropdown-settings-server'

export default async function DropdownSettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!canManageDropdowns(profile?.role)) redirect('/dashboard/settings')
  const { settings, version, error } = await loadDropdownSettings()
  return (
    <SettingsShell currentPath="/dashboard/settings/dropdowns" title="Keuzelijsten" description="Beheer namen, volgorde en zichtbaarheid van dropdownopties voor de hele applicatie.">
      {error ? <div className="ui-message ui-message-error">Keuzelijstbeheer is nog niet beschikbaar. Laat de databasemigratie voor keuzelijsten uitvoeren.</div> :
        <DropdownManagement initialSettings={settings} initialVersion={version} />}
    </SettingsShell>
  )
}
