import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const BASE_URL = 'https://api.tastyworks.com'

interface ParsedTrade {
  ticker: string
  strategy: 'cash_secured_put' | 'covered_call'
  trade_type: 'put' | 'call'
  opening_action: 'sell_to_open'
  strike_price: number
  expiry_date: string
  contracts: number
  premium_in: number
  date_opened: string
  tastytrade_order_id: string
}

function parseOccSymbol(symbol: string): { ticker: string; expiry: string; type: 'call' | 'put'; strike: number } | null {
  if (symbol.length < 21) return null
  const ticker = symbol.slice(0, 6).trim()
  const dateStr = symbol.slice(6, 12)
  const optType = symbol.slice(12, 13)
  const strikeStr = symbol.slice(13, 21)

  const yr = 2000 + parseInt(dateStr.slice(0, 2), 10)
  const mo = dateStr.slice(2, 4)
  const dy = dateStr.slice(4, 6)
  const strike = parseInt(strikeStr, 10) / 1000

  if (!ticker || !mo || !dy || isNaN(strike)) return null

  return {
    ticker,
    expiry: `${yr}-${mo}-${dy}`,
    type: optType === 'C' ? 'call' : 'put',
    strike,
  }
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string | null> {
  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': 'tastytrade-sdk-js' },
    body: JSON.stringify({
      'grant-type': 'refresh_token',
      'refresh-token': refreshToken,
      'client-id': clientId,
      'client-secret': clientSecret,
    }),
  })
  if (!res.ok) return null
  const data = await res.json()
  return data?.access_token ?? data?.['access-token'] ?? null
}

export async function GET() {
  try {
    const clientId = process.env.TASTYTRADE_CLIENT_ID
    const clientSecret = process.env.TASTYTRADE_CLIENT_SECRET
    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: 'Server env vars not set' }, { status: 500 })
    }

    const { data: rows } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', ['tastytrade_refresh_token', 'tastytrade_account_number'])

    const settings = Object.fromEntries((rows ?? []).map((r) => [r.key, r.value]))
    const refreshToken = settings['tastytrade_refresh_token']
    const accountNumber = settings['tastytrade_account_number']

    if (!refreshToken || !accountNumber) {
      return NextResponse.json({ error: 'tastytrade not connected' }, { status: 400 })
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken)
    if (!accessToken) {
      return NextResponse.json({ error: 'Failed to refresh access token' }, { status: 401 })
    }

    // Fetch last 90 days of filled orders
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)
    const startDateStr = startDate.toISOString().split('T')[0]

    const ordersUrl = new URL(`${BASE_URL}/accounts/${accountNumber}/orders`)
    ordersUrl.searchParams.set('status[]', 'Filled')
    ordersUrl.searchParams.set('per-page', '100')
    ordersUrl.searchParams.set('start-date', startDateStr)

    const ordersRes = await fetch(ordersUrl.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!ordersRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    const ordersData = await ordersRes.json()
    const items: any[] = ordersData?.data?.items ?? []

    const trades: ParsedTrade[] = []

    for (const item of items) {
      const order = item?.order ?? item
      if (!order) continue

      const legs: any[] = order.legs ?? []
      for (const leg of legs) {
        if (leg['instrument-type'] !== 'Equity Option') continue
        const action: string = leg.action ?? ''
        if (action !== 'Sell to Open') continue

        const parsed = parseOccSymbol(leg.symbol ?? '')
        if (!parsed) continue

        const fills: any[] = leg.fills ?? []
        const fillPrice = fills.length > 0
          ? fills.reduce((sum: number, f: any) => sum + parseFloat(f['fill-price'] ?? 0), 0) / fills.length
          : parseFloat(order.price ?? 0)

        const contracts = parseFloat(leg.quantity ?? 1)
        const filledAt: string = fills[0]?.['filled-at'] ?? order['placed-time'] ?? new Date().toISOString()

        trades.push({
          ticker: parsed.ticker,
          strategy: parsed.type === 'put' ? 'cash_secured_put' : 'covered_call',
          trade_type: parsed.type,
          opening_action: 'sell_to_open',
          strike_price: parsed.strike,
          expiry_date: parsed.expiry,
          contracts,
          premium_in: fillPrice * 100 * contracts,
          date_opened: filledAt.split('T')[0],
          tastytrade_order_id: String(order.id ?? ''),
        })
      }
    }

    // Sort newest first
    trades.sort((a, b) => b.date_opened.localeCompare(a.date_opened))

    return NextResponse.json({ trades })
  } catch (err) {
    console.error('tastytrade sync error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
