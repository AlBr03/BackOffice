import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')
  const tokenHash = request.nextUrl.searchParams.get('token_hash')
  const type = request.nextUrl.searchParams.get('type')
  const failure = new URL('/reset-password?error=invalid-link', request.url)
  if (request.nextUrl.searchParams.has('error') || (!code && !(tokenHash && type === 'recovery'))) {
    return NextResponse.redirect(failure)
  }
  try {
    const supabase = await createClient()
    const { data, error } = tokenHash && type === 'recovery'
      ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
      : await supabase.auth.exchangeCodeForSession(code!)
    if (error || !data.user || !data.session) return NextResponse.redirect(failure)
    // Fixed destination: no open redirects and no tokens in the destination URL.
    return NextResponse.redirect(new URL('/reset-password', request.url))
  } catch { return NextResponse.redirect(failure) }
}
