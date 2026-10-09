import { test } from 'node:test'
import assert from 'node:assert/strict'
import { load } from './load-ts.mjs'

test('Microsoft Graph sends to every customer address and supports single addresses', async () => {
  const previousEnv = { ...process.env }
  const previousFetch = globalThis.fetch
  const messages = []
  try {
    Object.assign(process.env, {
      MAIL_PROVIDER: 'microsoft-graph',
      MICROSOFT_TENANT_ID: 'test',
      MICROSOFT_CLIENT_ID: 'test',
      MICROSOFT_CLIENT_SECRET: 'test',
    })
    globalThis.fetch = async (url, options) => {
      if (url.includes('/oauth2/')) return { ok: true, json: async () => ({ access_token: 'test' }) }
      messages.push(JSON.parse(options.body).message)
      return { ok: true }
    }
    const { sendMail } = load('lib/mail.ts', { nodemailer: {} })
    for (const to of ['first@example.com, second@example.com', 'first@example.com']) {
      await sendMail({ to, subject: 'Order', text: 'Update' })
    }
    assert.deepEqual(messages.map(message => message.toRecipients.map(recipient => recipient.emailAddress.address)), [
      ['first@example.com', 'second@example.com'],
      ['first@example.com'],
    ])
  } finally {
    globalThis.fetch = previousFetch
    for (const key of Object.keys(process.env)) if (!(key in previousEnv)) delete process.env[key]
    Object.assign(process.env, previousEnv)
  }
})
