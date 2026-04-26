import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const CLIENT_ID = process.env.TASTYTRADE_CLIENT_ID!
const CLIENT_SECRET = process.env.TASTYTRADE_CLIENT_SECRET!
const REDIRECT_URI = process.env.NEXT_PUBLIC_TASTYTRADE_REDIRECT_URI ?? 'https://options-ochre.vercel.app/api/auth/callback'

// One-time setup: exchange tastytrade credentials for a refresh token
// and store it in Supabase settings.
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    if (!username || !password) {
      return NextResponse.json({ error: 'username and password required' }, { status: 400 })
    }

    // Step 1: Create a tastytrade session
    const sessionRes = await fetch(`${BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: username, password, 'remember-me': false }),
    })
    const sessionData = await sessionRes.json()

    if (!sessionRes.ok) {
      return NextResponse.json(
        { error: sessionData?.error?.message ?? 'Invalid tastytrade credentials' },
        { status: 401 }
      )
    }

    const sessionToken: string = sessionData?.data?.['session-token']
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token returned' }, { status: 500 })
    }

    // Step 2: Use the session to request an OAuth authorization code
    const authorizeRes = await fetch(`${BASE_URL}/oauth/authorize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: sessionToken,
      },
      body: JSON.stringify({
        'client-id': CLIENT_ID,
        'redirect-uri': REDIRECT_URI,
        'response-type': 'code',
        scope: 'read openid',
      }),
      redirect: 'manual',
    })

    let authCode: string | null = null

    // Code may come in Location header (redirect) or response body
    if (authorizeRes.status === 302 || authorizeRes.status === 301) {
      const location = authorizeRes.headers.get('location') ?? ''
      const url = new URL(location)
      authCode = url.searchParams.get('code')
    } else {
      const authorizeData = await authorizeRes.json().catch(() => null)
      authCode = authorizeData?.code ?? authorizeData?.data?.code ?? null
    }

    if (!authCode) {
      return NextResponse.json(
        { error: `OAuth authorize failed (${authorizeRes.status}). Check client ID and redirect URI.` },
        { status: 500 }
      )
    }

    // Step 3: Exchange auth code for access + refresh tokens
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        'grant-type': 'authorization_code',
        code: authCode,
        'client-id': CLIENT_ID,
        'client-secret': CLIENT_SECRET,
        'redirect-uri': REDIRECT_URI,
      }),
    })
    const tokenData = await tokenRes.json()

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: tokenData?.error_description ?? 'Token exchange failed' },
        { status: 500 }
      )
    }

    const refreshToken: string = tokenData?.refresh_token ?? tokenData?.['refresh-token']
    const accessToken: string = tokenData?.access_token ?? tokenData?.['access-token']

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token in response' }, { status: 500 })
    }

    // Step 4: Fetch account number
    const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const accountData = await accountRes.json()
    const accountNumber: string =
      accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''

    // Step 5: Store in Supabase settings
    await supabase.from('settings').upsert([
      { key: 'tastytrade_refresh_token', value: refreshToken },
      { key: 'tastytrade_account_number', value: accountNumber },
    ])

    return NextResponse.json({ success: true, accountNumber })
  } catch (err) {
    console.error('tastytrade connect error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
