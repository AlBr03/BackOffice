import { SettingsShell } from '@/components/settings-shell'

export default function SettingsIntegrationsPage() {
  const hasAppUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL)

  return (
    <SettingsShell
      currentPath="/dashboard/settings/integrations"
      title="Koppelingen"
      description="Houd hier overzicht op externe koppelingen en de informatie die je backoffice daar nu al voor gebruikt."
    >
      <section className="ui-card" style={{ display: 'grid', gap: 16 }}>
        <div className="ui-card-soft" style={{ display: 'grid', gap: 8 }}>
          <div className="ui-section-title">Wefact</div>
          <div className="ui-text-muted">
            Orders ondersteunen nu een offerte- en factuurreferentie plus directe links naar
            Wefact. Daarmee kan de administratie sneller doorklikken vanuit de orderdetailpagina.
          </div>
        </div>

        <div className="ui-card-soft" style={{ display: 'grid', gap: 8 }}>
          <div className="ui-section-title">Track & trace</div>
          <div className="ui-text-muted">
            {hasAppUrl
              ? 'De publieke bestelstatus kan links genereren voor klantcommunicatie.'
              : 'Stel NEXT_PUBLIC_APP_URL in om publieke track & trace-links volledig te activeren.'}
          </div>
        </div>
      </section>
    </SettingsShell>
  )
}
