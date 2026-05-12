import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isOfficeLikeRole } from '@/lib/roles'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !isOfficeLikeRole(profile.role)) {
    redirect('/dashboard')
  }

  return children
}
