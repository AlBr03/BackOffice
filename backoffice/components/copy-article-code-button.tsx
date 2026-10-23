'use client'

import { useState } from 'react'

export function CopyArticleCodeButton({ code }: { code: string }) {
  const [message, setMessage] = useState('')

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setMessage(`Artikelcode ${code} gekopieerd`)
    } catch {
      setMessage('Kopiëren mislukt. Selecteer de artikelcode en kopieer deze handmatig.')
    }
  }

  return <span className="ui-code-copy">
    <button type="button" className="ui-subtle-button ui-code-copy-button" disabled={!code.trim()} onClick={copyCode} aria-label={`Artikelcode ${code} kopiëren`} title="Artikelcode kopiëren">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V4H4v12h4" /></svg>
    </button>
    <span role="status" className="ui-code-copy-status">{message}</span>
  </span>
}
