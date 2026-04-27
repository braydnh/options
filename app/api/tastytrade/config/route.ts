import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'tastytrade-sdk-js' }

export async function GET() {
  try {
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tastytrade_session_token', 'tastytrade_account_number'])

    const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
    const sessionToken = settings['tastytrade_session_token']
    let accountNumber = settings['tastytrade_account_number'] ?? ''

    if (!sessionToken) {
      return NextResponse.json({ connected: false })
    }

    // Resolve account number if not yet stored
    if (!accountNumber) {
      try {
        const accRes = await fetch(`${BASE_URL}/customers/me/accounts`, {
          headers: { ...HEADERS, Authorization: sessionToken },
        })
        if (accRes.ok) {
          const accData = await accRes.json().catch(() => ({}))
          accountNumber = accData?.data?.items?.[0]?.account?.['account-number'] ?? ''
          if (accountNumber) {
            await supabase.from('settings').delete().eq('key', 'tastytrade_account_number')
            await supabase.from('settings').insert({ key: 'tastytrade_account_number', value: accountNumber })
          }
        }
      } catch { /* ignore */ }
    }

    return NextResponse.json({ connected: true, sessionToken, accountNumber })
  } catch (err) {
    return NextResponse.json({ connected: false, error: String(err) })
  }
}
