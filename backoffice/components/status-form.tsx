'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const STATUS_OPTIONS = [
  { value: 'new', label: 'Nieuw' },
  { value: 'in_progress', label: 'In behandeling' },
  { value: 'waiting_print', label: 'Wacht op print' },
  { value: 'completed', label: 'Afgerond' },
]

function translateStatus(status?: string | null) {
  switch (status) {
    case 'new':
      return 'Nieuw'
    case 'in_progress':
      return 'In behandeling'
    case 'waiting_print':
      return 'Wacht op print'
    case 'completed':
      return 'Afgerond'
    default:
      return status ?? '-'
  }
}

export function StatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string
  currentStatus: string
}) {
  const supabase = createClient()

  const [status, setStatus] = useState(currentStatus)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (status === currentStatus) {
      setMessage('De status is niet gewijzigd.')
      return
    }

    setIsSaving(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) {
      setMessage(error.message)
      setIsSaving(false)
      return
    }

    const oldLabel = translateStatus(currentStatus)
    const newLabel = translateStatus(status)

    await supabase.from('order_activity_log').insert({
      order_id: orderId,
      action_type: 'status_changed',
      description: `Status gewijzigd van ${oldLabel} naar ${newLabel}`,
      old_status: currentStatus,
      new_status: status,
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
          oldStatus: currentStatus,
          newStatus: status,
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
          Status wijzigen
        </label>

        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" disabled={isSaving}>
        {isSaving ? 'Opslaan...' : 'Status opslaan'}
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
