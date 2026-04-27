import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tastytrade_session_token', 'tastytrade_account_number'])

    const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
    const sessionToken = settings['tastytrade_session_token']
    const accountNumber = settings['tastytrade_account_number'] ?? ''

    if (!sessionToken) {
      return NextResponse.json({ connected: false })
    }

    return NextResponse.json({ connected: true, sessionToken, accountNumber })
  } catch (err) {
    return NextResponse.json({ connected: false, error: String(err) })
  }
}
