import nodemailer from 'nodemailer'

type MailOptions = {
  to: string
  subject: string
  text: string
  replyTo?: string | null
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

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.MAIL_FROM
  )
}

export async function sendMail({ to, subject, text, replyTo }: MailOptions) {
  if (!isMailConfigured()) {
    return {
      skipped: true,
      reason: 'Mail is nog niet geconfigureerd.',
    }
  }

  const port = parsePort()
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
    from: process.env.MAIL_FROM,
    to,
    replyTo: replyTo || process.env.MAIL_REPLY_TO || undefined,
    subject,
    text,
  })

  return {
    skipped: false,
  }
}
