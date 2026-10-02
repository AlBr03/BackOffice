import { test } from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server.js'
import { load } from './load-ts.mjs'

const { passwordError } = load('lib/password-recovery.ts')
test('password reset requires eight characters and matching confirmation without trimming passwords', () => {
  assert.match(passwordError('short', 'short'), /8 tekens/)
  assert.match(passwordError('abcdefgh', 'different'), /niet overeen/)
  assert.equal(passwordError('abcdefgh', 'abcdefgh'), null)
  assert.equal(passwordError(' secret ', ' secret '), null)
  assert.match(passwordError(' secret ', 'secret'), /niet overeen/)
})
function recoveryRoute(result = { data: { user: { id: 'user' }, session: { access_token: 'secret' } }, error: null }) {
  const calls = []
  const { GET } = load('app/auth/recovery/route.ts', {
    '@/lib/supabase/server': { createClient: async () => ({ auth: {
      exchangeCodeForSession: async code => { calls.push(['code', code]); return result },
      verifyOtp: async value => { calls.push(['otp', value]); return result },
    } }) },
  })
  return { GET, calls }
}
test('recovery callback exchanges a PKCE code and redirects to a clean fixed destination', async () => {
  const { GET, calls } = recoveryRoute()
  const result = await GET(new NextRequest('https://app.example/auth/recovery?code=one-time-code&next=https://attacker.example'))
  assert.deepEqual(calls, [['code', 'one-time-code']])
  assert.equal(result.headers.get('location'), 'https://app.example/reset-password')
})
test('recovery callback accepts only recovery token hashes', async () => {
  const { GET, calls } = recoveryRoute()
  const result = await GET(new NextRequest('https://app.example/auth/recovery?token_hash=hash&type=recovery'))
  assert.deepEqual(calls, [['otp', { token_hash: 'hash', type: 'recovery' }]])
  assert.equal(result.headers.get('location'), 'https://app.example/reset-password')
  for (const query of ['token_hash=hash&type=signup', 'token_hash=hash', 'error=access_denied&code=code', '']) {
    const route = recoveryRoute()
    const failed = await route.GET(new NextRequest('https://app.example/auth/recovery?' + query))
    assert.match(failed.headers.get('location'), /reset-password\?error=invalid-link$/)
    assert.deepEqual(route.calls, [])
  }
})
test('expired, used and unsuccessful recovery exchanges never open the password form', async () => {
  for (const result of [{ data: { user: null, session: null }, error: { message: 'Expired' } }, { data: { user: { id: 'user' }, session: null }, error: null }]) {
    const { GET } = recoveryRoute(result)
    const response = await GET(new NextRequest('https://app.example/auth/recovery?code=expired'))
    assert.equal(response.headers.get('location'), 'https://app.example/reset-password?error=invalid-link')
  }
})
