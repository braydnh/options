/**
 * Run this once from your local machine to get a tastytrade refresh token.
 * Your home IP is trusted by tastytrade — no device challenges.
 *
 * Usage:
 *   node scripts/get-tastytrade-token.mjs
 *
 * Then paste the printed refresh token into the Settings page.
 */

import { createInterface } from 'readline'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'tastytrade-sdk-js',
}

function ask(question, hidden = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  if (hidden) process.stdout.write(question)
  return new Promise((resolve) => {
    if (hidden) {
      process.stdin.setRawMode?.(true)
      let input = ''
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', function handler(ch) {
        if (ch === '\n' || ch === '\r') {
          process.stdin.setRawMode?.(false)
          process.stdin.pause()
          process.stdin.removeListener('data', handler)
          process.stdout.write('\n')
          rl.close()
          resolve(input)
        } else if (ch === '') {
          process.exit()
        } else {
          input += ch
          process.stdout.write('*')
        }
      })
    } else {
      rl.question(question, (answer) => { rl.close(); resolve(answer) })
    }
  })
}

async function safeJson(res, step) {
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error(`${step} returned non-JSON (${res.status}): ${text.slice(0, 200)}`) }
}

async function main() {
  console.log('\n── tastytrade refresh token generator ──\n')

  const username   = await ask('tastytrade username/email: ')
  const password   = await ask('tastytrade password: ', true)
  const clientId     = await ask('Client ID (TASTYTRADE_CLIENT_ID from Vercel): ')
  const clientSecret = await ask('Client Secret (TASTYTRADE_CLIENT_SECRET from Vercel): ', true)

  const redirectUri = 'https://options-ochre.vercel.app/api/auth/callback'

  // Step 1: Session
  process.stdout.write('\nCreating session...')
  let sessionData = null
  {
    const body = { login: username, password, 'remember-me': false }
    const res = await fetch(`${BASE_URL}/sessions`, { method: 'POST', headers: HEADERS, body: JSON.stringify(body) })
    sessionData = await safeJson(res, '/sessions')

    if (!res.ok) {
      const msg = sessionData?.error?.message ?? 'Session failed'
      if (msg.toLowerCase().includes('challenge') || msg.toLowerCase().includes('device')) {
        console.log(' device challenge required.')
        const otp = await ask('Enter the OTP code from your email/SMS/app: ')
        const res2 = await fetch(`${BASE_URL}/sessions`, {
          method: 'POST', headers: HEADERS,
          body: JSON.stringify({ ...body, 'one-time-password': otp }),
        })
        sessionData = await safeJson(res2, '/sessions (otp)')
        if (!res2.ok) throw new Error(sessionData?.error?.message ?? 'OTP session failed')
      } else {
        throw new Error(msg)
      }
    }
  }
  const sessionToken = sessionData?.data?.['session-token']
  if (!sessionToken) throw new Error('No session token in response')
  console.log(' done.')

  // Step 2: OAuth authorize → get code
  process.stdout.write('Authorizing...')
  const authRes = await fetch(`${BASE_URL}/oauth/authorize`, {
    method: 'POST',
    headers: { ...HEADERS, Authorization: sessionToken },
    body: JSON.stringify({
      'client-id': clientId,
      'redirect-uri': redirectUri,
      'response-type': 'code',
      scope: 'read openid',
    }),
    redirect: 'manual',
  })

  let authCode = null
  if (authRes.status === 302 || authRes.status === 301) {
    const loc = authRes.headers.get('location') ?? ''
    try { authCode = new URL(loc).searchParams.get('code') }
    catch { authCode = new URLSearchParams(loc.split('?')[1] ?? '').get('code') }
  } else {
    const body = await authRes.json().catch(() => null)
    authCode = body?.code ?? body?.data?.code ?? null
  }
  if (!authCode) throw new Error(`OAuth authorize failed (${authRes.status}) — check your redirect URI matches: ${redirectUri}`)
  console.log(' done.')

  // Step 3: Exchange code for tokens
  process.stdout.write('Exchanging code for tokens...')
  const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      'grant-type': 'authorization_code',
      code: authCode,
      'client-id': clientId,
      'client-secret': clientSecret,
      'redirect-uri': redirectUri,
    }),
  })
  const tokenData = await safeJson(tokenRes, '/oauth/token')
  if (!tokenRes.ok) throw new Error(tokenData?.error_description ?? tokenData?.error ?? 'Token exchange failed')
  const refreshToken = tokenData?.refresh_token ?? tokenData?.['refresh-token']
  if (!refreshToken) throw new Error('No refresh token in response')
  console.log(' done.\n')

  console.log('─'.repeat(60))
  console.log('REFRESH TOKEN (paste this into the Settings page):')
  console.log('─'.repeat(60))
  console.log(refreshToken)
  console.log('─'.repeat(60))
  console.log('\nDone! Paste the token above into Settings → tastytrade → "Paste refresh token".')
}

main().catch((err) => { console.error('\nError:', err.message); process.exit(1) })
