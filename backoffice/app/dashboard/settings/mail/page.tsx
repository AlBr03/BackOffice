import { SettingsShell } from '@/components/settings-shell'

function statusRow(label: string, value: string | undefined, required = true) {
  const isConfigured = Boolean(value)

  return (
    <div
      key={label}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        background: '#f8faff',
        border: '1px solid #e6edf7',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: '#082D78' }}>{label}</div>
        <div style={{ color: '#5b6b84', fontSize: 14 }}>
          {required ? 'Verplicht voor klantmails' : 'Optioneel'}
        </div>
      </div>
      <div style={{ color: isConfigured ? '#167c3a' : '#b00012', fontWeight: 700 }}>
        {isConfigured ? 'Ingesteld' : 'Ontbreekt'}
      </div>
    </div>
  )
}

export default function SettingsMailPage() {
  return (
    <SettingsShell
      currentPath="/dashboard/settings/mail"
      title="Mailinstellingen"
      description="Bekijk welke mailinstellingen al aanwezig zijn en wat nog nodig is om klantcommunicatie betrouwbaar te versturen."
    >
      <section
        style={{
          background: 'white',
          borderRadius: 18,
          padding: 24,
          border: '1px solid #d9e2f0',
          boxShadow: '0 6px 24px rgba(8,45,120,0.08)',
          display: 'grid',
          gap: 14,
        }}
      >
        <h2 style={{ margin: 0, color: '#082D78' }}>SMTP status</h2>
        <p style={{ margin: 0, color: '#5b6b84' }}>
          Deze pagina laat alleen zien of de serverinstellingen gevuld zijn. De geheime waardes
          zelf worden hier bewust niet getoond.
        </p>

        {statusRow('SMTP host', process.env.SMTP_HOST)}
        {statusRow('SMTP user', process.env.SMTP_USER)}
        {statusRow('SMTP password', process.env.SMTP_PASS)}
        {statusRow('Afzender', process.env.MAIL_FROM)}
        {statusRow('Reply-to', process.env.MAIL_REPLY_TO, false)}
        {statusRow('Publieke app URL', process.env.NEXT_PUBLIC_APP_URL)}
      </section>
    </SettingsShell>
  )
}
