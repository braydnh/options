import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'User-Agent': 'tastytrade-sdk-js',
}

export async function POST(req: NextRequest) {
  try {
    const { sessionToken } = await req.json()
    if (!sessionToken?.trim()) {
      return NextResponse.json({ error: 'Session token is required' }, { status: 400 })
    }

    const token = sessionToken.trim().replace(/^Bearer\s+/i, '')

    // Verify token works by fetching account info
    const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
      headers: { ...HEADERS, Authorization: token },
    })

    if (!accountRes.ok) {
      const text = await accountRes.text()
      let msg = 'Session token is invalid or expired'
      try {
        const data = JSON.parse(text)
        msg = data?.error?.message ?? msg
      } catch { /* ignore */ }
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const accountData = await accountRes.json().catch(() => ({}))
    const accountNumber: string =
      accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''

    await supabase.from('settings').upsert([
      { key: 'tastytrade_session_token', value: token },
      { key: 'tastytrade_account_number', value: accountNumber },
    ])

    return NextResponse.json({ success: true, accountNumber })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
