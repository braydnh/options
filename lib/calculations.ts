import type { Trade, TradeStrategy } from '@/types'

export function calcNetPremium(
  premiumIn: number,
  premiumOut: number,
  fees: number
): number {
  return premiumIn - premiumOut - fees
}

export function calcDte(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function calcCapitalSecured(strikePrice: number, contracts: number): number {
  return strikePrice * contracts * 100
}

export function calcUnrealizedPnl(
  strategy: TradeStrategy,
  premiumIn: number,
  strikePrice: number,
  contracts: number,
  stockPrice: number
): number {
  const intrinsic =
    strategy === 'cash_secured_put'
      ? Math.max(strikePrice - stockPrice, 0)
      : Math.max(stockPrice - strikePrice, 0)
  return premiumIn - intrinsic * contracts * 100
}

export function calcReturnOnCapital(netPremium: number, capitalSecured: number): number {
  if (capitalSecured === 0) return 0
  return netPremium / capitalSecured
}

export function calcAnnualizedReturn(rocDecimal: number, daysHeld: number): number {
  if (daysHeld === 0) return 0
  return rocDecimal * (365 / daysHeld)
}

export function dteColor(dte: number): string {
  if (dte <= 7) return '#F87171'
  if (dte <= 21) return '#F59E0B'
  return '#22C55E'
}

export function dteFillPercent(dateOpened: string, expiryDate: string): number {
  const opened = new Date(dateOpened).getTime()
  const expiry = new Date(expiryDate).getTime()
  const now = Date.now()
  const total = expiry - opened
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, ((now - opened) / total) * 100))
}

export function calcCumulativePnl(
  closedTrades: Trade[]
): { date: string; cumPnl: number }[] {
  const sorted = [...closedTrades]
    .filter((t) => t.date_closed)
    .sort((a, b) => a.date_closed!.localeCompare(b.date_closed!))

  let running = 0
  return sorted.map((t) => {
    running += calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
    return { date: t.date_closed!, cumPnl: Math.round(running * 100) / 100 }
  })
}

export function groupByMonth(
  closedTrades: Trade[]
): { month: string; pnl: number }[] {
  const map = new Map<string, number>()

  const sorted = [...closedTrades]
    .filter((t) => t.date_closed)
    .sort((a, b) => a.date_closed!.localeCompare(b.date_closed!))

  for (const t of sorted) {
    const d = new Date(t.date_closed!)
    const label = d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
    map.set(label, (map.get(label) ?? 0) + net)
  }

  return Array.from(map.entries()).map(([month, pnl]) => ({ month, pnl }))
}
