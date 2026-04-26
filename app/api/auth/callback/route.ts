import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const CLIENT_ID = process.env.TASTYTRADE_CLIENT_ID!
const CLIENT_SECRET = process.env.TASTYTRADE_CLIENT_SECRET!
const REDIRECT_URI = process.env.TASTYTRADE_REDIRECT_URI ?? 'https://options-ochre.vercel.app/api/auth/callback'

const JSON_HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json' }

function redirectTo(req: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, req.url))
}

// tastytrade redirects here after the user authorises in their browser.
// We exchange the code for tokens and store the refresh token in Supabase.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return redirectTo(req, `/settings?error=${encodeURIComponent(oauthError)}`)
  }
  if (!code) {
    return redirectTo(req, '/settings?error=no_code')
  }

  try {
    // Exchange auth code for access + refresh tokens
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        'grant-type': 'authorization_code',
        code,
        'client-id': CLIENT_ID,
        'client-secret': CLIENT_SECRET,
        'redirect-uri': REDIRECT_URI,
      }),
    })

    const tokenText = await tokenRes.text()
    let tokenData: any = {}
    try { tokenData = JSON.parse(tokenText) } catch {
      return redirectTo(req, `/settings?error=${encodeURIComponent('Token exchange failed: ' + tokenText.slice(0, 80))}`)
    }

    if (!tokenRes.ok) {
      const msg = tokenData?.error_description ?? tokenData?.error ?? 'Token exchange failed'
      return redirectTo(req, `/settings?error=${encodeURIComponent(msg)}`)
    }

    const refreshToken: string = tokenData?.refresh_token ?? tokenData?.['refresh-token'] ?? ''
    const accessToken: string = tokenData?.access_token ?? tokenData?.['access-token'] ?? ''

    if (!refreshToken) {
      return redirectTo(req, '/settings?error=no_refresh_token')
    }

    // Fetch account number
    const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    const accountData = await accountRes.json().catch(() => ({}))
    const accountNumber: string =
      accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''

    // Store in Supabase settings
    await supabase.from('settings').upsert([
      { key: 'tastytrade_refresh_token', value: refreshToken },
      { key: 'tastytrade_account_number', value: accountNumber },
    ])

    return redirectTo(req, '/settings?connected=true')
  } catch (err) {
    console.error('tastytrade callback error:', err)
    return redirectTo(req, `/settings?error=${encodeURIComponent(String(err))}`)
  }
}
