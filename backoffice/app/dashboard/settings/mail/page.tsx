import { SettingsShell } from '@/components/settings-shell'
import { ADMINISTRATION_FROM, isMicrosoftGraphConfigured, isSmtpConfigured } from '@/lib/mail'

function statusRow(label: string, value: string | undefined, required = true) {
  const isConfigured = Boolean(value)

  return (
    <div
      key={label}
      className="ui-card-soft ui-mobile-stack"
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
  const mailFrom = process.env.MAIL_FROM || ADMINISTRATION_FROM

  return (
    <SettingsShell
      currentPath="/dashboard/settings/mail"
      title="Mailinstellingen"
      description="Bekijk welke mailinstellingen al aanwezig zijn en wat nog nodig is om klantcommunicatie betrouwbaar te versturen."
    >
      <section className="ui-card" style={{ display: 'grid', gap: 14 }}>
        <h2 className="ui-section-title">Mailstatus</h2>
        <p className="ui-text-muted">
          Deze pagina laat alleen zien of de serverinstellingen gevuld zijn. De geheime waardes
          zelf worden hier bewust niet getoond.
        </p>

        {statusRow('Microsoft Graph', isMicrosoftGraphConfigured() ? 'configured' : undefined, false)}
        {statusRow('Microsoft tenant ID', process.env.MICROSOFT_TENANT_ID, false)}
        {statusRow('Microsoft client ID', process.env.MICROSOFT_CLIENT_ID, false)}
        {statusRow('Microsoft client secret', process.env.MICROSOFT_CLIENT_SECRET, false)}
        {statusRow('SMTP fallback', isSmtpConfigured() ? 'configured' : undefined, false)}
        {statusRow('SMTP host', process.env.SMTP_HOST)}
        {statusRow('SMTP user', process.env.SMTP_USER)}
        {statusRow('SMTP password', process.env.SMTP_PASS)}
        {statusRow('Afzender', mailFrom)}
        {statusRow('Fallback reply-to', process.env.MAIL_REPLY_TO, false)}
        {statusRow('Publieke app URL', process.env.NEXT_PUBLIC_APP_URL)}
      </section>
    </SettingsShell>
  )
}
