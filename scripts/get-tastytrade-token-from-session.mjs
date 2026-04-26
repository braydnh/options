/**
 * Use an existing tastytrade session token (grabbed from your browser's Network tab)
 * to complete the OAuth flow and get a refresh token.
 *
 * Usage:
 *   node scripts/get-tastytrade-token-from-session.mjs
 *
 * How to get your session token:
 *   1. Open tastytrade.com → DevTools (F12) → Network tab
 *   2. Type "sessions" in the filter and reload the page
 *   3. Click the POST /sessions request → Response tab → copy "session-token"
 *   4. If no /sessions request appears, click any request to api.tastyworks.com
 *      → Request Headers → copy the "Authorization:" value
 */

import { createInterface } from 'readline'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'tastytrade-sdk-js',
}

function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => { rl.close(); resolve(answer.trim()) })
  })
}

async function safeJson(res, step) {
  const text = await res.text()
  try { return JSON.parse(text) }
  catch { throw new Error(`${step} returned non-JSON (${res.status}): ${text.slice(0, 300)}`) }
}

async function main() {
  console.log('\n── tastytrade token from existing session ──\n')

  let sessionToken = await ask('Paste your session token (or Authorization header value): ')
  // Strip "Bearer " prefix if they copied the full header value
  sessionToken = sessionToken.replace(/^Bearer\s+/i, '')

  const clientId     = await ask('Client ID (TASTYTRADE_CLIENT_ID from Vercel): ')
  const clientSecret = await ask('Client Secret (TASTYTRADE_CLIENT_SECRET from Vercel): ')
  const redirectUri  = 'https://options-ochre.vercel.app/api/auth/callback'

  // OAuth authorize using existing session token
  process.stdout.write('\nAuthorizing...')
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
    const body = await safeJson(authRes, '/oauth/authorize').catch((e) => { throw e })
    authCode = body?.code ?? body?.data?.code ?? null
    if (!authCode) {
      console.log('\nAuthorize response:')
      console.log(JSON.stringify(body, null, 2))
      throw new Error(`OAuth authorize failed (${authRes.status}) — session token may be expired or wrong client ID`)
    }
  }
  if (!authCode) throw new Error(`No auth code in redirect (${authRes.status}). Check redirect URI matches: ${redirectUri}`)
  console.log(' done.')

  // Exchange code for tokens
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
  console.log('REFRESH TOKEN — paste into Settings page:')
  console.log('─'.repeat(60))
  console.log(refreshToken)
  console.log('─'.repeat(60))
}

main().catch((err) => { console.error('\nError:', err.message); process.exit(1) })
