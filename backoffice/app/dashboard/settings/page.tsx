import Link from 'next/link'
import { SettingsShell } from '@/components/settings-shell'

const cards = [
  {
    href: '/dashboard/settings/accounts',
    title: 'Accounts',
    description: 'Beheer gebruikers, rollen en winkelkoppelingen voor nieuwe accounts.',
  },
  {
    href: '/dashboard/settings/stores',
    title: 'Winkels',
    description: 'Voeg winkels toe, wijzig namen en houd de locatiestructuur netjes bij.',
  },
  {
    href: '/dashboard/settings/mail',
    title: 'Mail',
    description: 'Controleer of klantmails technisch zijn voorbereid en welke instellingen nog missen.',
  },
  {
    href: '/dashboard/settings/integrations',
    title: 'Koppelingen',
    description: 'Bekijk welke externe koppelingen klaarstaan, zoals Wefact en track & trace.',
  },
]

export default function SettingsPage() {
  return (
    <SettingsShell
      currentPath="/dashboard/settings"
      title="Instellingen"
      description="Beheer hier de vaste onderdelen van je backoffice, zodat accountbeheer, winkels, mail en koppelingen op een logische plek samenkomen."
    >
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              display: 'grid',
              gap: 10,
              background: 'white',
              borderRadius: 18,
              padding: 24,
              border: '1px solid #d9e2f0',
              boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
              textDecoration: 'none',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#082D78' }}>{card.title}</div>
            <div style={{ color: '#5b6b84', lineHeight: 1.6 }}>{card.description}</div>
            <div style={{ color: '#164196', fontWeight: 700 }}>Openen</div>
          </Link>
        ))}
      </section>
    </SettingsShell>
  )
}
