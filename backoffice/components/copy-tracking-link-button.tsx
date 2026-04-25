'use client'

import { useState } from 'react'

export function CopyTrackingLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Kon trackinglink niet kopieren', error)
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        background: copied ? '#167c3a' : '#164196',
        color: 'white',
      }}
    >
      {copied ? 'Gekopieerd' : 'Link kopieren'}
    </button>
  )
}
