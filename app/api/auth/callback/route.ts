import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const CLIENT_ID = process.env.TASTYTRADE_CLIENT_ID!
const CLIENT_SECRET = process.env.TASTYTRADE_CLIENT_SECRET!

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'tastytrade-sdk-js',
}

// Called by the browser fetch after tastytrade redirects here with ?code=...
// Returns JSON so the settings page can read the result without a page reload.
export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url)
  const code = searchParams.get('code')
  const oauthError = searchParams.get('error')

  if (oauthError) {
    return NextResponse.json({ error: oauthError }, { status: 400 })
  }
  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 })
  }

  // The redirect_uri must exactly match what was sent in the authorize request.
  // We derive it from the request so it always matches regardless of domain.
  const redirectUri = `${origin}/api/auth/callback`

  try {
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({
        'grant-type': 'authorization_code',
        code,
        'client-id': CLIENT_ID,
        'client-secret': CLIENT_SECRET,
        'redirect-uri': redirectUri,
      }),
    })

    const tokenText = await tokenRes.text()
    let tokenData: any = {}
    try { tokenData = JSON.parse(tokenText) } catch {
      return NextResponse.json({ error: `Token exchange failed: ${tokenText.slice(0, 120)}` }, { status: 500 })
    }

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: tokenData?.error_description ?? tokenData?.error ?? 'Token exchange failed' },
        { status: 500 }
      )
    }

    const refreshToken: string = tokenData?.refresh_token ?? tokenData?.['refresh-token'] ?? ''
    const accessToken: string = tokenData?.access_token ?? tokenData?.['access-token'] ?? ''

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token returned' }, { status: 500 })
    }

    const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    const accountData = await accountRes.json().catch(() => ({}))
    const accountNumber: string =
      accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''

    await supabase.from('settings').upsert([
      { key: 'tastytrade_refresh_token', value: refreshToken },
      { key: 'tastytrade_account_number', value: accountNumber },
    ])

    return NextResponse.json({ success: true, accountNumber })
  } catch (err) {
    console.error('tastytrade callback error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
