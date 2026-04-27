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

    // Fetch account number — tastytrade session tokens are valid from any IP
    // (unlike login, which requires a trusted IP). Skip hard error if this fails;
    // the sync route will surface a clearer message if the token is truly expired.
    let accountNumber = ''
    try {
      const accountRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
        headers: { ...HEADERS, Authorization: token },
      })
      if (accountRes.ok) {
        const accountData = await accountRes.json().catch(() => ({}))
        accountNumber = accountData?.data?.items?.[0]?.account?.['account-number'] ?? ''
      }
    } catch { /* ignore — store token regardless */ }

    await supabase.from('settings').delete().in('key', ['tastytrade_session_token', 'tastytrade_account_number'])
    const rows: { key: string; value: string }[] = [{ key: 'tastytrade_session_token', value: token }]
    if (accountNumber) rows.push({ key: 'tastytrade_account_number', value: accountNumber })
    const { error: insertErr } = await supabase.from('settings').insert(rows)
    if (insertErr) throw new Error(`Failed to save: ${insertErr.message}`)

    return NextResponse.json({ success: true, accountNumber })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
