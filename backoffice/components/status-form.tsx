'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  ARTICLE_STATUS_OPTIONS,
  PRINT_STATUS_OPTIONS,
  deriveLegacyStatus,
  getInitialPrintStatus,
  translateArticleStatus,
  translatePrintStatus,
} from '@/lib/order-status'

export function StatusForm({
  orderId,
  currentArticleStatus,
  currentPrintStatus,
  hasPrint,
}: {
  orderId: string
  currentArticleStatus: string | null
  currentPrintStatus: string | null
  hasPrint: boolean
}) {
  const supabase = createClient()

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

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('orders')
      .update({
        article_status: articleStatus,
        print_status: nextPrintStatus,
        status: deriveLegacyStatus(articleStatus, hasPrint, nextPrintStatus),
      })
      .eq('id', orderId)

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    const changes = []

    if (articleStatus !== (currentArticleStatus ?? 'new')) {
      changes.push(
        `Artikelenstatus gewijzigd van ${translateArticleStatus(currentArticleStatus)} naar ${translateArticleStatus(articleStatus)}`
      )
    }

    if (hasPrint && nextPrintStatus !== (currentPrintStatus ?? getInitialPrintStatus(true))) {
      changes.push(
        `Printstatus gewijzigd van ${translatePrintStatus(currentPrintStatus ?? getInitialPrintStatus(true))} naar ${translatePrintStatus(nextPrintStatus)}`
      )
    }

    const changeDescription = changes.join(' | ')

    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action_type: 'status_changed',
      description: changeDescription,
      old_status: currentArticleStatus,
      new_status: articleStatus,
      performed_by: user?.id ?? null,
    })

    try {
      const response = await fetch(`/api/orders/${orderId}/notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'status_changed',
          changeSummary: changeDescription,
        }),
      })

      if (!response.ok) {
        setMessage('Status bijgewerkt, maar de klantmail kon niet worden verstuurd.')
        setIsSaving(false)
        window.location.reload()
        return
      }

      const result = (await response.json()) as { skipped?: boolean }

      if (result.skipped) {
        setMessage('Status bijgewerkt. Er is geen klantmail verstuurd.')
        setIsSaving(false)
        window.location.reload()
        return
      }
    } catch (notificationError) {
      console.error('Statusmail kon niet worden verstuurd', notificationError)
      setMessage('Status bijgewerkt, maar de klantmail kon niet worden verstuurd.')
      setIsSaving(false)
      window.location.reload()
      return
    }

    setMessage('Status succesvol bijgewerkt en klantmail verstuurd.')
    setIsSaving(false)
    window.location.reload()
  }

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 12 }}>
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
