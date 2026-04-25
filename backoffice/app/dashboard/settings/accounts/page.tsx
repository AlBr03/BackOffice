import { AccountsManagement } from '@/components/accounts-management'
import { SettingsShell } from '@/components/settings-shell'

export default function SettingsAccountsPage() {
  return (
    <SettingsShell
      currentPath="/dashboard/settings/accounts"
      title="Accountbeheer"
      description="Bekijk alle accounts, wijs rollen toe en koppel winkelaccounts aan de juiste vestiging."
    >
      <AccountsManagement />
    </SettingsShell>
  )
}
