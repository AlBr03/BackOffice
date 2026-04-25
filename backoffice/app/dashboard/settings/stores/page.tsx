import { SettingsShell } from '@/components/settings-shell'
import { StoresManagement } from '@/components/stores-management'

export default function SettingsStoresPage() {
  return (
    <SettingsShell
      currentPath="/dashboard/settings/stores"
      title="Winkelbeheer"
      description="Houd je winkels centraal bij, zodat orders en gebruikers altijd aan de juiste locatie hangen."
    >
      <StoresManagement />
    </SettingsShell>
  )
}
