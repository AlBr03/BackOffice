'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ARTICLE_STATUS_OPTIONS,
  PRINT_STATUS_OPTIONS,
  getInitialPrintStatus,
} from '@/lib/order-status'

export function StatusForm({
  orderId,
  currentArticleStatus,
  currentPrintStatus,
  hasPrint,
  role,
}: {
  orderId: string
  currentArticleStatus: string | null
  currentPrintStatus: string | null
  hasPrint: boolean
  role?: string | null
}) {
  const router = useRouter()
  const isPrintOnly = role === 'print'

  const [articleStatus, setArticleStatus] = useState(currentArticleStatus ?? 'new')
  const [printStatus, setPrintStatus] = useState(
    hasPrint ? currentPrintStatus ?? getInitialPrintStatus(true) ?? 'new' : null
  )
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    const nextPrintStatus = hasPrint ? printStatus ?? getInitialPrintStatus(true) : null

    if (
      articleStatus === (currentArticleStatus ?? 'new') &&
      nextPrintStatus === (hasPrint ? currentPrintStatus ?? getInitialPrintStatus(true) : null)
    ) {
      setMessage('De statussen zijn niet gewijzigd.')
      return
    }

    setIsSaving(true)

    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        articleStatus,
        printStatus: nextPrintStatus,
      }),
    })

    const result = (await response.json().catch(() => null)) as
      | {
          error?: string
          skipped?: boolean
          reason?: string
          mail?: { skipped?: boolean; reason?: string; error?: string }
        }
      | null

    if (!response.ok) {
      setMessage(result?.error ?? 'Status kon niet worden bijgewerkt.')
      setIsSaving(false)
      return
    }

    if (result?.skipped) {
      setMessage(result.reason ?? 'De statussen zijn niet gewijzigd.')
      setIsSaving(false)
      router.refresh()
      return
    }

    setMessage(
      result?.mail?.skipped
        ? result.mail.reason ?? 'Status bijgewerkt. Er is geen klantmail verstuurd.'
        : 'Status succesvol bijgewerkt en klantmail verstuurd.'
    )
    setIsSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
      {!isPrintOnly ? (
      <div>
        <label
          style={{
            display: 'block',
            marginBottom: 8,
            color: '#5b6b84',
            fontWeight: 600,
          }}
        >
          Artikelenstatus
        </label>

        <select value={articleStatus} onChange={(e) => setArticleStatus(e.target.value)}>
          {ARTICLE_STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      ) : null}

      {hasPrint ? (
        <div>
          <label
            style={{
              display: 'block',
              marginBottom: 8,
              color: '#5b6b84',
              fontWeight: 600,
            }}
          >
            Printstatus
          </label>

          <select
            value={printStatus ?? 'new'}
            onChange={(e) => setPrintStatus(e.target.value)}
          >
            {PRINT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div
          style={{
            background: '#eef3fb',
            color: '#164196',
            padding: 14,
            borderRadius: 12,
            fontWeight: 600,
          }}
        >
          Voor deze order is geen printstatus van toepassing.
        </div>
      )}

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Opslaan...' : 'Statussen opslaan'}
      </button>

      {message ? (
        <p
          style={{
            margin: 0,
            color:
              message.includes('succesvol') || message.includes('niet gewijzigd')
                ? '#167c3a'
                : '#b00012',
            fontWeight: 600,
          }}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
