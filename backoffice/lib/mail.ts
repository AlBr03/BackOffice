import nodemailer from 'nodemailer'

type MailOptions = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string | null
}

export const ADMINISTRATION_EMAIL = 'administratie@intersportveghel.nl'
export const ADMINISTRATION_FROM = `"Intersport Veghel Administratie" <${ADMINISTRATION_EMAIL}>`

type MailProvider = 'microsoft-graph' | 'smtp'

function getMailProvider(): MailProvider {
  const configuredProvider = process.env.MAIL_PROVIDER?.trim().toLowerCase()

  if (configuredProvider === 'microsoft-graph' || configuredProvider === 'graph') {
    return 'microsoft-graph'
  }

  if (configuredProvider === 'smtp') {
    return 'smtp'
  }

  return isMicrosoftGraphConfigured() ? 'microsoft-graph' : 'smtp'
}

function parsePort() {
  const value = Number(process.env.SMTP_PORT ?? '587')
  return Number.isFinite(value) ? value : 587
}

function isSecure(port: number) {
  if (process.env.SMTP_SECURE) {
    return process.env.SMTP_SECURE === 'true'
  }

  return port === 465
}

export function isMicrosoftGraphConfigured() {
  return Boolean(
    process.env.MICROSOFT_TENANT_ID &&
      process.env.MICROSOFT_CLIENT_ID &&
      process.env.MICROSOFT_CLIENT_SECRET
  )
}

export function isSmtpConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  )
}

export function isMailConfigured() {
  return getMailProvider() === 'microsoft-graph'
    ? isMicrosoftGraphConfigured()
    : isSmtpConfigured()
}

async function getMicrosoftGraphAccessToken() {
  const tenantId = process.env.MICROSOFT_TENANT_ID
  const clientId = process.env.MICROSOFT_CLIENT_ID
  const clientSecret = process.env.MICROSOFT_CLIENT_SECRET

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph is nog niet volledig geconfigureerd.')
  }

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Microsoft Graph token ophalen mislukt: ${response.status} ${errorText}`)
  }

  const data = (await response.json()) as { access_token?: string }

  if (!data.access_token) {
    throw new Error('Microsoft Graph gaf geen access token terug.')
  }

  return data.access_token
}

async function sendMailWithMicrosoftGraph({ to, subject, text, html, replyTo }: MailOptions) {
  const accessToken = await getMicrosoftGraphAccessToken()
  const effectiveReplyTo = replyTo || process.env.MAIL_REPLY_TO || ADMINISTRATION_EMAIL

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(ADMINISTRATION_EMAIL)}/sendMail`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          subject,
          body: {
            contentType: html ? 'HTML' : 'Text',
            content: html ?? text,
          },
          toRecipients: [
            {
              emailAddress: {
                address: to,
              },
            },
          ],
          replyTo: [
            {
              emailAddress: {
                address: effectiveReplyTo,
              },
            },
          ],
        },
        saveToSentItems: true,
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Microsoft Graph mail verzenden mislukt: ${response.status} ${errorText}`)
  }
}

async function sendMailWithSmtp({ to, subject, text, html, replyTo }: MailOptions) {
  const port = parsePort()
  const from = process.env.MAIL_FROM || ADMINISTRATION_FROM
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: isSecure(port),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from,
    to,
    replyTo: replyTo || process.env.MAIL_REPLY_TO || ADMINISTRATION_EMAIL,
    subject,
    text,
    html,
  })
}

export async function sendMail(options: MailOptions) {
  const provider = getMailProvider()

  if (!isMailConfigured()) {
    return {
      skipped: true,
      reason:
        provider === 'microsoft-graph'
          ? 'Microsoft Graph is nog niet geconfigureerd.'
          : 'SMTP is nog niet geconfigureerd.',
    }
  }

  if (provider === 'microsoft-graph') {
    await sendMailWithMicrosoftGraph(options)
  } else {
    await sendMailWithSmtp(options)
  }

  return {
    skipped: false,
    provider,
  }
}
