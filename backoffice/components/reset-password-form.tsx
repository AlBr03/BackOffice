'use client'

import Link from 'next/link'
import { useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { passwordError } from '@/lib/password-recovery'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const lock = useRef(false)
  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (lock.current || done) return
    const problem = passwordError(password, confirmation)
    if (problem) { setError(problem); return }
    lock.current = true; setPending(true); setError(null)
    try {
      const supabase = createClient()
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { setError('De herstellink is verlopen. Vraag een nieuwe link aan.'); return }
      const { error } = await supabase.auth.updateUser({ password })
      if (error) { setError(error.message); return }
      setPassword(''); setConfirmation(''); setDone(true)
      await supabase.auth.signOut({ scope: 'global' }).catch(() => undefined)
    } catch { setError('Verbinding mislukt. Probeer het opnieuw.') }
    finally { lock.current = false; setPending(false) }
  }
  if (done) return <div><p role="status">Je wachtwoord is gewijzigd. Log opnieuw in met je nieuwe wachtwoord.</p><Link href="/login">Naar inloggen</Link></div>
  return <form onSubmit={submit} style={{ display: 'grid', gap: 12 }}>
    <label htmlFor="new-password">Nieuw wachtwoord (minimaal 8 tekens)</label>
    <input id="new-password" type="password" autoComplete="new-password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required disabled={pending} />
    <label htmlFor="confirm-password">Herhaal nieuw wachtwoord</label>
    <input id="confirm-password" type="password" autoComplete="new-password" minLength={8} value={confirmation} onChange={e => setConfirmation(e.target.value)} required disabled={pending} />
    <button type="submit" disabled={pending}>{pending ? 'Opslaan…' : 'Nieuw wachtwoord opslaan'}</button>
    {error ? <p role="alert" style={{ color: 'var(--error-text)' }}>{error}</p> : null}
    <Link href="/forgot-password">Nieuwe herstellink aanvragen</Link>
  </form>
}
