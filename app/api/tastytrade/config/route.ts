import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Returns the tastytrade client config to the browser.
// Client secret + refresh token are server-only env vars — this route
// acts as the secure bridge so the client-side SDK can self-refresh tokens.
export async function GET() {
  try {
    const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET
    const clientId = process.env.TASTYTRADE_CLIENT_ID

    if (!clientSecret || !clientId) {
      return NextResponse.json({ connected: false, error: 'Server env vars not set' })
    }

    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tastytrade_refresh_token', 'tastytrade_account_number'])

    const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
    const refreshToken = settings['tastytrade_refresh_token']
    const accountNumber = settings['tastytrade_account_number'] ?? ''

    if (!refreshToken) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({
      connected: true,
      clientId,
      clientSecret,
      refreshToken,
      accountNumber,
    })
  } catch (err) {
    return NextResponse.json({ connected: false, error: String(err) })
  }
}
