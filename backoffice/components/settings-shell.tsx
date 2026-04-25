import Link from 'next/link'

const NAV_ITEMS = [
  { href: '/dashboard/settings', label: 'Overzicht' },
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
    <div style={{ display: 'grid', gap: 20 }}>
      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          border: '1px solid #d9e2f0',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 8 }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: 1.1,
                color: '#E30613',
              }}
            >
              INSTELLINGEN
            </div>
            <h1 style={{ margin: 0, color: '#082D78', fontSize: 30 }}>{title}</h1>
            <p style={{ margin: 0, color: '#5b6b84', maxWidth: 700 }}>{description}</p>
          </div>

          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 42,
              padding: '0 14px',
              borderRadius: 10,
              background: '#eef3fb',
              color: '#164196',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
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
        <aside
          style={{
            background: 'white',
            borderRadius: 18,
            padding: 14,
            boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
            border: '1px solid #d9e2f0',
            display: 'grid',
            gap: 8,
          }}
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentPath === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'block',
                  borderRadius: 12,
                  padding: '12px 14px',
                  textDecoration: 'none',
                  fontWeight: 700,
                  background: isActive ? '#164196' : '#f8faff',
                  color: isActive ? 'white' : '#164196',
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
