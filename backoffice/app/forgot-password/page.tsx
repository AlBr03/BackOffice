'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { AuthCard } from '@/components/auth-card'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (lock.current) return
    lock.current = true; setPending(true); setError(null); setSent(false)
    try {
      const { error } = await createClient().auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/recovery`,
      })
      if (error) { setError('De aanvraag kon niet worden verstuurd. Probeer het over een paar minuten opnieuw.'); return }
      setSent(true)
    } catch { setError('Verbinding mislukt. Probeer het opnieuw.') }
    finally { lock.current = false; setPending(false) }
  }
  return <AuthCard title="Wachtwoord vergeten?">
    <p>Vul het e-mailadres van je account in. Je ontvangt een link om een nieuw wachtwoord te kiezen.</p>
    <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
      <label htmlFor="recovery-email">E-mailadres</label>
      <input id="recovery-email" type="email" autoComplete="email" value={email} onChange={e => { setEmail(e.target.value); setSent(false) }} required disabled={pending} />
      <button type="submit" disabled={pending || sent}>{pending ? 'Versturen…' : 'Herstellink versturen'}</button>
      {sent ? <p role="status">Als er een account bestaat voor dit e-mailadres, ontvang je een herstellink. Controleer ook je spammap. Open de link in dezelfde browser waarin je deze aanvraag hebt gedaan.</p> : null}
      {error ? <p role="alert" style={{ color: 'var(--error-text)' }}>{error}</p> : null}
    </form>
    <p><Link href="/login">Terug naar inloggen</Link></p>
  </AuthCard>
}
