'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PrintProofStatus = 'pending' | 'approved' | 'rejected'

function translatePrintProofStatus(status?: string | null) {
  switch (status) {
    case 'approved':
      return 'Goedgekeurd'
    case 'rejected':
      return 'Afgewezen'
    default:
      return 'Nog niet beoordeeld'
  }
}

export function PublicPrintProofApprovalForm({
  token,
  initialStatus,
  initialFeedback,
}: {
  token: string
  initialStatus?: string | null
  initialFeedback?: string | null
}) {
  const router = useRouter()
  const [choice, setChoice] = useState<PrintProofStatus>(
    initialStatus === 'approved' || initialStatus === 'rejected' ? initialStatus : 'pending'
  )
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submitDecision(action: 'approved' | 'rejected') {
    setMessage(null)
    setError(null)

    const trimmedFeedback = feedback.trim()

    if (action === 'rejected' && !trimmedFeedback) {
      setError('Geef aan wat er aangepast moet worden.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch(`/api/public/orders/${token}/proof`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action,
          feedback: action === 'rejected' ? trimmedFeedback : null,
        }),
      })
      const result = (await response.json()) as { error?: string }

      if (!response.ok) {
        setError(result.error ?? 'Beoordeling kon niet worden opgeslagen.')
        return
      }

      setChoice(action)
      if (action === 'approved') {
        setFeedback('')
      }

      setMessage(
        action === 'approved'
          ? 'Bedankt, het printvoorbeeld is goedgekeurd.'
          : 'Bedankt, uw feedback is doorgestuurd naar de winkel.'
      )
      router.refresh()
    } catch {
      setError('Er ging iets mis tijdens het opslaan.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 14,
        padding: 18,
        borderRadius: 18,
        background: '#f8faff',
        border: '1px solid #e6edf7',
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: '#082D78', marginBottom: 4 }}>
          Printvoorbeeld beoordelen
        </div>
        <div style={{ color: '#5b6b84', lineHeight: 1.5 }}>
          Controleer het printvoorbeeld bij de bestanden. Keur het goed of geef door wat aangepast
          moet worden.
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          width: 'fit-content',
          padding: '7px 11px',
          borderRadius: 999,
          background: choice === 'approved' ? '#e8f7ee' : choice === 'rejected' ? '#fff1f2' : '#eef3fb',
          color: choice === 'approved' ? '#167c3a' : choice === 'rejected' ? '#b00012' : '#164196',
          fontWeight: 800,
        }}
      >
        {translatePrintProofStatus(choice)}
      </div>

      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        placeholder="Bij afwijzen: beschrijf wat er aangepast moet worden"
        rows={4}
        disabled={isSubmitting}
      />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button type="button" onClick={() => submitDecision('approved')} disabled={isSubmitting}>
          Goedkeuren
        </button>
        <button
          type="button"
          onClick={() => submitDecision('rejected')}
          disabled={isSubmitting}
          style={{
            background: '#E30613',
          }}
        >
          Afwijzen met bericht
        </button>
      </div>

      {message ? <div style={{ color: '#167c3a', fontWeight: 700 }}>{message}</div> : null}
      {error ? <div style={{ color: '#b00012', fontWeight: 700 }}>{error}</div> : null}
    </div>
  )
}
