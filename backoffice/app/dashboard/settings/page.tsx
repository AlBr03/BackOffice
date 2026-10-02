import Link from 'next/link'
import { SettingsShell } from '@/components/settings-shell'
import { DropdownManagementAccess } from '@/components/dropdown-provider'

const cards = [
  { href: '/dashboard/settings/business', title: 'Bedrijfsinstellingen', description: 'Beheer reminders, mailtemplates, leveranciers, orderdefaults, bedrijfsgegevens en verplichte velden.' },
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
    href: '/dashboard/settings/dropdowns',
    title: 'Keuzelijsten',
    description: 'Beheer dropdownopties, namen en volgorde als beheerder of hoofdkantoor.',
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
        className="ui-mobile-grid-two"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: 20,
        }}
      >
        {cards.map((card) => {
          const link = (
          <Link
            key={card.href}
            href={card.href}
            className="ui-card"
            style={{ display: 'grid', gap: 10, textDecoration: 'none' }}
          >
            <div className="ui-section-title" style={{ fontSize: 22 }}>{card.title}</div>
            <div className="ui-text-muted">{card.description}</div>
            <div style={{ color: 'var(--link-color)', fontWeight: 700 }}>Openen</div>
          </Link>
          )
          return ['/dashboard/settings/dropdowns', '/dashboard/settings/business'].includes(card.href)
            ? <DropdownManagementAccess key={card.href}>{link}</DropdownManagementAccess>
            : link
        })}
      </section>

      <section className="ui-card" style={{ display: 'grid', gap: 14 }}>
        <div>
          <div className="ui-eyebrow">Systeeminformatie</div>
          <h2 className="ui-section-title" style={{ marginTop: 8 }}>
            INTERSPORT Backoffice
          </h2>
        </div>

        <div className="ui-card-soft" style={{ display: 'grid', gap: 10 }}>
          <div>
            <div style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 4 }}>
              Ontwerp en ontwikkeling
            </div>
            <div style={{ fontWeight: 800 }}>Alexander Brinkman</div>
          </div>

          <div>
            <div style={{ color: 'var(--text-soft)', fontSize: 13, marginBottom: 4 }}>
              Systeem
            </div>
            <div style={{ fontWeight: 700 }}>
              Backoffice voor orderbeheer, klantcommunicatie en track & trace.
            </div>
          </div>
        </div>
      </section>
    </SettingsShell>
  )
}
