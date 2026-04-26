import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'tastytrade-sdk-js',
}

// Accepts a manually obtained refresh token, verifies it works, stores it.
export async function POST(req: NextRequest) {
  try {
    const { refreshToken } = await req.json()
    if (!refreshToken?.trim()) {
      return NextResponse.json({ error: 'Refresh token is required' }, { status: 400 })
    }

    const clientId = process.env.TASTYTRADE_CLIENT_ID
    const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Server env vars not configured' }, { status: 500 })
    }

    // Verify token works by exchanging for an access token
    const tokenRes = await fetch(`${BASE_URL}/oauth/token`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify({
        'grant-type': 'refresh_token',
        'refresh-token': refreshToken.trim(),
        'client-id': clientId,
        'client-secret': clientSecret,
      }),
    })

    const tokenText = await tokenRes.text()
    let tokenData: any = {}
    try { tokenData = JSON.parse(tokenText) } catch {
      return NextResponse.json({ error: 'Invalid token — could not exchange for access token' }, { status: 400 })
    }

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: tokenData?.error_description ?? tokenData?.error ?? 'Token verification failed' },
        { status: 400 }
      )
    }

    const accessToken: string = tokenData?.access_token ?? tokenData?.['access-token'] ?? ''

    // Fetch account number
    const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
      headers: { ...HEADERS, Authorization: `Bearer ${accessToken}` },
    })
    const accountData = await accountRes.json().catch(() => ({}))
    const accountNumber: string =
      accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''

    await supabase.from('settings').upsert([
      { key: 'tastytrade_refresh_token', value: refreshToken.trim() },
      { key: 'tastytrade_account_number', value: accountNumber },
    ])

    return NextResponse.json({ success: true, accountNumber })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
