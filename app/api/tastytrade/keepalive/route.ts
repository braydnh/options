import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'
const HEADERS = { 'Accept': 'application/json', 'User-Agent': 'tastytrade-sdk-js' }

export async function GET() {
  const { data: rows } = await supabase
    .from('settings')
    .select('key, value')
    .eq('key', 'tastytrade_session_token')

  const sessionToken = rows?.[0]?.value
  if (!sessionToken) return NextResponse.json({ ok: false, reason: 'no token stored' })

  const res = await fetch(`${BASE_URL}/preferences`, {
    headers: { ...HEADERS, Authorization: sessionToken },
  })

  return NextResponse.json({ ok: res.ok, status: res.status })
}
