import { SettingsShell } from '@/components/settings-shell'

export default function SettingsIntegrationsPage() {
  const hasAppUrl = Boolean(process.env.NEXT_PUBLIC_APP_URL)

  return (
    <SettingsShell
      currentPath="/dashboard/settings/integrations"
      title="Koppelingen"
      description="Houd hier overzicht op externe koppelingen en de informatie die je backoffice daar nu al voor gebruikt."
    >
      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          border: '1px solid #d9e2f0',
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          display: 'grid',
          gap: 16,
        }}
      >
        <div
          style={{
            display: 'grid',
            gap: 8,
            padding: 16,
            borderRadius: 16,
            background: '#f8faff',
            border: '1px solid #e6edf7',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: '#082D78' }}>Wefact</div>
          <div style={{ color: '#5b6b84', lineHeight: 1.6 }}>
            Orders ondersteunen nu een offerte- en factuurreferentie plus directe links naar
            Wefact. Daarmee kan de administratie sneller doorklikken vanuit de orderdetailpagina.
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gap: 8,
            padding: 16,
            borderRadius: 16,
            background: '#f8faff',
            border: '1px solid #e6edf7',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 800, color: '#082D78' }}>Track & trace</div>
          <div style={{ color: '#5b6b84', lineHeight: 1.6 }}>
            {hasAppUrl
              ? 'De publieke bestelstatus kan links genereren voor klantcommunicatie.'
              : 'Stel NEXT_PUBLIC_APP_URL in om publieke track & trace-links volledig te activeren.'}
          </div>
        </div>
      </section>
    </SettingsShell>
  )
}
