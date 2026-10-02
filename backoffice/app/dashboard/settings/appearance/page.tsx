import { cookies } from 'next/headers'
import { AppearanceSettings } from '@/components/appearance-settings'
import { SettingsShell } from '@/components/settings-shell'
import { createClient } from '@/lib/supabase/server'
import { loadPersonalSettings } from '@/lib/business-settings-server'

export default async function SettingsAppearancePage() {
  const cookieStore = await cookies()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const personal = user ? (await loadPersonalSettings(user.id)).settings : null
  const initialMode = (cookieStore.get('ui-mode')?.value ?? personal?.mode) === 'dark' ? 'dark' : 'light'

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
