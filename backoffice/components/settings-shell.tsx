import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard/settings', label: 'Overzicht' },
  { href: '/dashboard/settings/appearance', label: 'Weergave' },
  { href: '/dashboard/settings/accounts', label: 'Accounts' },
  { href: '/dashboard/settings/stores', label: 'Winkels' },
  { href: '/dashboard/settings/mail', label: 'Mail' },
  { href: '/dashboard/settings/integrations', label: 'Koppelingen' },
]

export function SettingsShell({
  currentPath,
  title,
  description,
  children,
}: {
  currentPath: string
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div className="ui-stack">
      <section className="ui-card">
        <div className="ui-card-header">
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="ui-eyebrow">Instellingen</div>
            <h1 className="ui-title">{title}</h1>
            <p className="ui-text-muted" style={{ maxWidth: 700 }}>{description}</p>
          </div>

          <Link href="/dashboard" className="ui-link-button">
            Terug naar dashboard
          </Link>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px minmax(0, 1fr)',
          gap: 20,
          alignItems: 'start',
        }}
      >
        <aside className="ui-card" style={{ padding: 14, display: 'grid', gap: 8 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className="ui-link-button ui-link-button--nav"
                style={{
                  display: 'block',
                  background: isActive ? 'var(--button-background)' : 'var(--surface-alt)',
                  color: isActive ? 'white' : '#164196',
                  border: isActive ? 'none' : '1px solid rgba(125, 146, 182, 0.16)',
                  boxShadow: isActive ? 'var(--button-shadow)' : 'none',
                }}
              >
                {item.label}
              </Link>
            )
          })}
        </aside>

        <div style={{ display: 'grid', gap: 20 }}>{children}</div>
      </div>
    </div>
  )
}
