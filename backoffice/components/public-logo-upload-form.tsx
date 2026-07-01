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

    const files = Array.from(fileInputRef.current?.files ?? [])

    if (files.length === 0) {
      setError('Selecteer eerst een of meer AI- of EPS-bestanden.')
      return
    }

    const invalidExtensionFile = files.find((file) => {
      const extension = file.name.split('.').pop()?.toLowerCase()
      return extension !== 'ai' && extension !== 'eps'
    })

    if (invalidExtensionFile) {
      setError(`${invalidExtensionFile.name} is geen .ai of .eps bestand.`)
      return
    }

    const tooLargeFile = files.find((file) => file.size > MAX_FILE_SIZE_MB * 1024 * 1024)

    if (tooLargeFile) {
      setError(`${tooLargeFile.name} is groter dan ${MAX_FILE_SIZE_MB} MB.`)
      return
    }

    const formData = new FormData()
    files.forEach((file) => {
      formData.append('files', file)
    })

    setIsUploading(true)

    try {
      const response = await fetch(`/api/public/orders/${token}/files`, {
        method: 'POST',
        body: formData,
      })
      const result = (await response.json()) as {
        error?: string
        fileName?: string
        fileNames?: string[]
        uploaded?: number
      }

      if (!response.ok) {
        setError(result.error ?? 'Logo kon niet worden geupload.')
        return
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      const uploaded = result.uploaded ?? result.fileNames?.length ?? 1
      setMessage(
        uploaded === 1
          ? `${result.fileNames?.[0] ?? result.fileName ?? 'Logo'} is ontvangen en toegevoegd aan de bestelling.`
          : `${uploaded} logo's zijn ontvangen en toegevoegd aan de bestelling.`
      )
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
          Upload hier uw logo&apos;s als .ai of .eps bestand. De bestanden komen automatisch bij de
          bestelling in de backoffice.
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept=".ai,.eps" multiple disabled={isUploading} />

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploaden...' : "Logo's uploaden"}
      </button>

      {message ? (
        <div style={{ color: '#167c3a', fontWeight: 700 }}>{message}</div>
      ) : null}
      {error ? <div style={{ color: '#b00012', fontWeight: 700 }}>{error}</div> : null}
    </form>
  )
}
