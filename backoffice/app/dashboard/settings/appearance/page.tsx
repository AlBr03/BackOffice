import { cookies } from 'next/headers'
import { AppearanceSettings } from '@/components/appearance-settings'
import { SettingsShell } from '@/components/settings-shell'

export default async function SettingsAppearancePage() {
  const cookieStore = await cookies()
  const initialMode = cookieStore.get('ui-mode')?.value === 'dark' ? 'dark' : 'light'

  return (
    <SettingsShell
      currentPath="/dashboard/settings/appearance"
      title="Weergave"
      description="Stem de interface af op hoe jij het prettigst werkt, zonder dat de rest van het systeem hoeft te veranderen."
    >
      <AppearanceSettings initialMode={initialMode} />
    </SettingsShell>
  )
}
