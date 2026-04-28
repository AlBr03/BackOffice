import { SettingsShell } from '@/components/settings-shell'

function statusRow(label: string, value: string | undefined, required = true) {
  const isConfigured = Boolean(value)

  return (
    <div
      key={label}
      className="ui-card-soft"
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) auto',
        gap: 12,
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{label}</div>
        <div style={{ color: 'var(--text-soft)', fontSize: 14 }}>
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
      <section className="ui-card" style={{ display: 'grid', gap: 14 }}>
        <h2 className="ui-section-title">SMTP status</h2>
        <p className="ui-text-muted">
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
