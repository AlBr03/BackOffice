'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function UploadForm({ orderId }: { orderId: string }) {
  const router = useRouter()
  const supabase = createClient()

  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!file) {
      setMessage('Selecteer eerst een bestand.')
      return
    }

    try {
      setIsUploading(true)

      const safeFileName = file.name.replace(/\s+/g, '-')
      const filePath = `${orderId}/${Date.now()}-${safeFileName}`

      const { error: uploadError } = await supabase.storage
        .from('print-files')
        .upload(filePath, file)

      if (uploadError) {
        setMessage(uploadError.message)
        return
      }

      const { error: dbError } = await supabase.from('order_files').insert({
        order_id: orderId,
        file_path: filePath,
        file_name: file.name,
        mime_type: file.type || null,
      })

      if (dbError) {
        setMessage(dbError.message)
        return
      }

      try {
        const response = await fetch(`/api/orders/${orderId}/notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type: 'print_proof_ready', fileName: file.name }),
        })
        const result = (await response.json().catch(() => null)) as
          | { skipped?: boolean; reason?: string; error?: string }
          | null

        if (!response.ok) {
          setMessage(
            result?.error ?? 'Printvoorbeeld succesvol geupload. Klantmail kon niet worden verstuurd.'
          )
          return
        }

        setMessage(
          result?.skipped
            ? `Printvoorbeeld succesvol geupload. ${result.reason ?? 'Er is geen klantmail verstuurd.'}`
            : 'Printvoorbeeld succesvol geupload en klantmail verstuurd.'
        )
      } catch {
        setMessage('Printvoorbeeld succesvol geupload. Klantmail kon niet worden verstuurd.')
      }

      setFile(null)
      router.refresh()
    } catch {
      setMessage('Er ging iets mis tijdens het uploaden.')
    } finally {
      setIsUploading(false)
    }
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
          Upload printvoorbeeld
        </label>

        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          disabled={isUploading}
        />
      </div>

      <button type="submit" disabled={isUploading}>
        {isUploading ? 'Uploaden...' : 'Printvoorbeeld uploaden'}
      </button>

      {message ? (
        <p
          style={{
            margin: 0,
            color: message.includes('succesvol') ? '#167c3a' : '#b00012',
            fontWeight: 600,
          }}
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
