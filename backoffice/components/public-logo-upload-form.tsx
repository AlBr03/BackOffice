'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const MAX_FILE_SIZE_MB = 50

export function PublicLogoUploadForm({ token }: { token: string }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)
    setError(null)

    const file = fileInputRef.current?.files?.[0]

    if (!file) {
      setError('Selecteer eerst een AI- of EPS-bestand.')
      return
    }

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension !== 'ai' && extension !== 'eps') {
      setError('Alleen .ai en .eps bestanden zijn toegestaan.')
      return
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`Het bestand mag maximaal ${MAX_FILE_SIZE_MB} MB zijn.`)
      return
    }

    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)

    try {
      const response = await fetch(`/api/public/orders/${token}/files`, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as { error?: string; fileName?: string }

      if (!response.ok) {
        setError(result.error ?? 'Logo kon niet worden geupload.')
        return
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      setMessage(`${result.fileName ?? 'Logo'} is ontvangen en toegevoegd aan de bestelling.`)
      router.refresh()
    } catch {
      setError('Er ging iets mis tijdens het uploaden.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        display: 'grid',
        gap: 12,
        padding: 18,
        borderRadius: 18,
        background: '#f8faff',
        border: '1px solid #e6edf7',
      }}
    >
      <div>
        <div style={{ fontWeight: 800, color: '#082D78', marginBottom: 4 }}>
          Logo toevoegen
        </div>
        <div style={{ color: '#5b6b84', lineHeight: 1.5 }}>
          Upload hier uw logo als .ai of .eps bestand. Het bestand komt automatisch bij de
          bestelling in de backoffice.
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".ai,.eps" disabled={isUploading} />

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploaden...' : 'Logo uploaden'}
      </button>

      {message ? (
        <div style={{ color: '#167c3a', fontWeight: 700 }}>{message}</div>
      ) : null}
      {error ? <div style={{ color: '#b00012', fontWeight: 700 }}>{error}</div> : null}
    </form>
  )
}
