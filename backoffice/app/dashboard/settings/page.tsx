import Link from 'next/link'
import { SettingsShell } from '@/components/settings-shell'

const cards = [
  {
    href: '/dashboard/settings/appearance',
    title: 'Weergave',
    description: 'Kies tussen lichte en donkere modus voor een prettigere backoffice-ervaring.',
  },
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
            className="ui-card"
            style={{ display: 'grid', gap: 10, textDecoration: 'none' }}
          >
            <div className="ui-section-title" style={{ fontSize: 22 }}>{card.title}</div>
            <div className="ui-text-muted">{card.description}</div>
            <div style={{ color: 'var(--intersport-blue)', fontWeight: 700 }}>Openen</div>
          </Link>
        ))}
      </section>
    </SettingsShell>
  )
}
