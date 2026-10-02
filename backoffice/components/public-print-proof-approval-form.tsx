'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type PrintProofStatus = 'pending' | 'approved' | 'rejected'

type PreviewFile = {
  fileName: string
  mimeType?: string | null
  signedUrl?: string | null
} | null

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
  previewFile,
}: {
  token: string
  initialStatus?: string | null
  initialFeedback?: string | null
  previewFile?: PreviewFile
}) {
  const router = useRouter()
  const [choice, setChoice] = useState<PrintProofStatus>(
    initialStatus === 'approved' || initialStatus === 'rejected' ? initialStatus : 'pending'
  )
  const [feedback, setFeedback] = useState(initialFeedback ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const previewUrl = previewFile?.signedUrl ?? null
  const previewMimeType = previewFile?.mimeType ?? ''
  const isPdfPreview =
    previewMimeType === 'application/pdf' || previewFile?.fileName.toLowerCase().endsWith('.pdf')
  const isImagePreview = previewMimeType.startsWith('image/')

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
        background: 'var(--surface-alt)',
        border: '1px solid var(--border)',
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: 'var(--heading-color)', marginBottom: 4 }}>
          Printvoorbeeld beoordelen
        </div>
        <div style={{ color: 'var(--text-soft)', lineHeight: 1.5 }}>
          Controleer het printvoorbeeld hieronder. Keur het goed of geef door wat aangepast moet worden.
        </div>
      </div>

      {previewFile ? (
        <div style={{ display: 'grid', gap: 8 }}>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              minHeight: 220,
              aspectRatio: '4 / 3',
              borderRadius: 16,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: '0 10px 24px rgba(8,45,120,0.08)',
            }}
          >
            {previewUrl && isPdfPreview ? (
              <iframe
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                title={`Printvoorbeeld ${previewFile.fileName}`}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 0,
                  pointerEvents: 'none',
                }}
              />
            ) : null}

            {previewUrl && isImagePreview ? (
              <div
                role="img"
                aria-label={`Printvoorbeeld ${previewFile.fileName}`}
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundImage: `url("${previewUrl}")`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'contain',
                }}
              />
            ) : null}

            {!previewUrl || (!isPdfPreview && !isImagePreview) ? (
              <div
                style={{
                  height: '100%',
                  display: 'grid',
                  placeItems: 'center',
                  padding: 18,
                  color: 'var(--text-soft)',
                  textAlign: 'center',
                }}
              >
                Voorbeeld kan hier niet worden weergegeven.
              </div>
            ) : null}

            {previewUrl ? (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open printvoorbeeld ${previewFile.fileName} groot`}
                title="Klik om het printvoorbeeld groot te openen"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'grid',
                  alignItems: 'end',
                  padding: 12,
                  textDecoration: 'none',
                  background: 'linear-gradient(180deg, transparent 58%, rgba(8,45,120,0.68) 100%)',
                }}
              >
                <span
                  style={{
                    justifySelf: 'end',
                    padding: '8px 12px',
                    borderRadius: 999,
                    background: 'var(--surface)',
                    color: 'var(--heading-color)',
                    fontWeight: 800,
                    boxShadow: '0 6px 16px rgba(8,45,120,0.16)',
                  }}
                >
                  Vergroten
                </span>
              </a>
            ) : null}
          </div>

          <div style={{ color: 'var(--text-soft)', fontSize: 13 }}>
            {previewFile.fileName}
          </div>
        </div>
      ) : null}

      <div
        style={{
          display: 'inline-flex',
          width: 'fit-content',
          padding: '7px 11px',
          borderRadius: 999,
          background: choice === 'approved' ? 'var(--success-background)' : choice === 'rejected' ? 'var(--error-background)' : 'var(--info-background)',
          color: choice === 'approved' ? 'var(--success-text)' : choice === 'rejected' ? 'var(--error-text)' : 'var(--link-color)',
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

      {message ? <div style={{ color: 'var(--success-text)', fontWeight: 700 }}>{message}</div> : null}
      {error ? <div style={{ color: 'var(--error-text)', fontWeight: 700 }}>{error}</div> : null}
    </div>
  )
}
