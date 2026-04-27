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

function dumpHeaders(res) {
  console.log('\nResponse headers:')
  res.headers.forEach((v, k) => console.log(`  ${k}: ${v}`))
}

async function doAuthorize(sessionToken, clientId, redirectUri, extraHeaders = {}) {
  return fetch(`${BASE_URL}/oauth/authorize`, {
    method: 'POST',
    headers: { ...HEADERS, Authorization: sessionToken, ...extraHeaders },
    body: JSON.stringify({
      'client-id': clientId,
      'redirect-uri': redirectUri,
      'response-type': 'code',
      scope: 'read openid',
    }),
    redirect: 'manual',
  })
}

async function main() {
  console.log('\n── tastytrade token from existing session ──\n')

  let sessionToken = await ask('Paste your session token (or Authorization header value): ')
  // Strip "Bearer " prefix if they copied the full header value
  sessionToken = sessionToken.replace(/^Bearer\s+/i, '')

  const clientId     = await ask('Client ID (TASTYTRADE_CLIENT_ID from Vercel): ')
  const clientSecret = await ask('Client Secret (TASTYTRADE_CLIENT_SECRET from Vercel): ')
  const redirectUri  = 'https://options-ochre.vercel.app/api/auth/callback'

  // First authorize attempt
  process.stdout.write('\nAuthorizing...')
  let authRes = await doAuthorize(sessionToken, clientId, redirectUri)

  // Dump all response headers so we can see what tastytrade sends back
  console.log('')
  dumpHeaders(authRes)

  let authCode = null

  if (authRes.status === 302 || authRes.status === 301) {
    const loc = authRes.headers.get('location') ?? ''
    try { authCode = new URL(loc).searchParams.get('code') }
    catch { authCode = new URLSearchParams(loc.split('?')[1] ?? '').get('code') }
  } else {
    const body = await safeJson(authRes, '/oauth/authorize').catch((e) => { throw e })

    // Check if tastytrade is asking for 2FA
    const isTwoFactor =
      authRes.status === 401 &&
      (body?.error?.message?.toLowerCase().includes('two factor') ||
       body?.error?.message?.toLowerCase().includes('otp') ||
       body?.error?.code === 'invalid_credentials')

    if (isTwoFactor) {
      // tastytrade sends the challenge token in a response header
      const challengeToken =
        authRes.headers.get('x-tastyworks-challenge-token') ??
        authRes.headers.get('X-Tastyworks-Challenge-Token') ??
        body?.error?.['challenge-token'] ??
        body?.['challenge-token'] ?? null

      console.log('\nAuthorize response body:')
      console.log(JSON.stringify(body, null, 2))

      if (challengeToken) {
        console.log(`\nChallenge token captured: ${challengeToken}`)
        console.log('tastytrade should send an OTP to your registered device (app / email / SMS).')
      } else {
        console.log('\nNo challenge token found in headers or body.')
        console.log('tastytrade may have already sent an OTP to your registered device.')
      }

      const otp = await ask('\nEnter the OTP code (or press Enter to skip and retry without it): ')
      if (!otp) throw new Error('No OTP provided. Check your tastytrade app, email, or SMS.')

      const otpHeaders = {
        'X-Tastyworks-OTP': otp,
        ...(challengeToken ? { 'X-Tastyworks-Challenge-Token': challengeToken } : {}),
      }

      process.stdout.write('Retrying authorize with OTP...')
      authRes = await doAuthorize(sessionToken, clientId, redirectUri, otpHeaders)
      console.log('')
      dumpHeaders(authRes)

      if (authRes.status === 302 || authRes.status === 301) {
        const loc = authRes.headers.get('location') ?? ''
        try { authCode = new URL(loc).searchParams.get('code') }
        catch { authCode = new URLSearchParams(loc.split('?')[1] ?? '').get('code') }
      } else {
        const body2 = await safeJson(authRes, '/oauth/authorize (otp)').catch((e) => { throw e })
        authCode = body2?.code ?? body2?.data?.code ?? null
        if (!authCode) {
          console.log('\nOTP authorize response:')
          console.log(JSON.stringify(body2, null, 2))
          throw new Error(`OAuth authorize failed after OTP (${authRes.status})`)
        }
      }
    } else {
      authCode = body?.code ?? body?.data?.code ?? null
      if (!authCode) {
        console.log('\nAuthorize response:')
        console.log(JSON.stringify(body, null, 2))
        throw new Error(`OAuth authorize failed (${authRes.status}) — session token may be expired or wrong client ID`)
      }
    }
  }

  if (!authCode) throw new Error(`No auth code in redirect (${authRes.status}). Check redirect URI matches: ${redirectUri}`)
  console.log('Auth code received.')

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
