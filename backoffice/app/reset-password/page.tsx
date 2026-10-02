import Link from 'next/link'
import { AuthCard } from '@/components/auth-card'
import { ResetPasswordForm } from '@/components/reset-password-form'
import { createClient } from '@/lib/supabase/server'

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return <AuthCard title="Nieuw wachtwoord kiezen">
    {params.error || error || !user
      ? <div><p role="alert">Deze herstellink is ongeldig of verlopen. Vraag een nieuwe link aan en open deze in dezelfde browser.</p><Link href="/forgot-password">Nieuwe herstellink aanvragen</Link></div>
      : <ResetPasswordForm />}
  </AuthCard>
}
