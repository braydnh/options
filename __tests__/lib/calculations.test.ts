import {
  calcNetPremium,
  calcDte,
  calcCapitalSecured,
  calcUnrealizedPnl,
  calcReturnOnCapital,
  calcAnnualizedReturn,
  dteColor,
  dteFillPercent,
  calcCumulativePnl,
  groupByMonth,
} from '@/lib/calculations'
import type { Trade } from '@/types'

describe('calcNetPremium', () => {
  it('subtracts premium_out and fees from premium_in', () => {
    expect(calcNetPremium(185, 40, 1)).toBe(144)
  })
  it('returns premium_in when no buyback or fees', () => {
    expect(calcNetPremium(200, 0, 0)).toBe(200)
  })
})

describe('calcDte', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calcDte(today)).toBe(0)
  })
  it('returns positive for future date', () => {
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    expect(calcDte(future)).toBe(14)
  })
  it('returns negative for expired option', () => {
    const past = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    expect(calcDte(past)).toBe(-2)
  })
})

describe('calcCapitalSecured', () => {
  it('multiplies strike × contracts × 100', () => {
    expect(calcCapitalSecured(170, 1)).toBe(17000)
    expect(calcCapitalSecured(50, 3)).toBe(15000)
  })
})

describe('calcUnrealizedPnl', () => {
  it('CSP: full profit when stock is above strike', () => {
    // Stock at 175, sold CSP at strike 170, received $185 premium, 1 contract
    // Intrinsic = max(170 - 175, 0) = 0 → P&L = 185 - 0 = 185
    expect(calcUnrealizedPnl('cash_secured_put', 185, 170, 1, 175)).toBe(185)
  })
  it('CSP: partial loss when stock is below strike', () => {
    // Stock at 160, sold CSP at strike 170, received $185 premium, 1 contract
    // Intrinsic = max(170 - 160, 0) = 10 → loss = 10 × 100 = 1000 → P&L = 185 - 1000 = -815
    expect(calcUnrealizedPnl('cash_secured_put', 185, 170, 1, 160)).toBe(-815)
  })
  it('CC: full profit when stock is below strike', () => {
    // Stock at 240, sold CC at strike 250, received $320 premium, 1 contract
    // Intrinsic = max(240 - 250, 0) = 0 → P&L = 320
    expect(calcUnrealizedPnl('covered_call', 320, 250, 1, 240)).toBe(320)
  })
  it('CC: loss when stock is above strike', () => {
    // Stock at 270, sold CC at strike 250, received $320 premium, 1 contract
    // Intrinsic = max(270 - 250, 0) = 20 → loss = 2000 → P&L = 320 - 2000 = -1680
    expect(calcUnrealizedPnl('covered_call', 320, 250, 1, 270)).toBe(-1680)
  })
  it('handles multiple contracts', () => {
    // Stock at 160, sold 2x CSP at strike 170, received $370 premium
    // Intrinsic per share = 10, loss = 10 × 100 × 2 = 2000 → P&L = 370 - 2000 = -1630
    expect(calcUnrealizedPnl('cash_secured_put', 370, 170, 2, 160)).toBe(-1630)
  })
})

describe('calcReturnOnCapital', () => {
  it('divides net premium by capital secured', () => {
    expect(calcReturnOnCapital(185, 17000)).toBeCloseTo(0.01088, 4)
  })
  it('returns 0 for zero capital', () => {
    expect(calcReturnOnCapital(100, 0)).toBe(0)
  })
})

describe('calcAnnualizedReturn', () => {
  it('scales ROC by 365 / days held', () => {
    expect(calcAnnualizedReturn(0.01, 30)).toBeCloseTo(0.1217, 3)
  })
  it('returns 0 for zero days held', () => {
    expect(calcAnnualizedReturn(0.01, 0)).toBe(0)
  })
})

describe('dteColor', () => {
  it('returns red for ≤7 DTE', () => {
    expect(dteColor(7)).toBe('#F87171')
    expect(dteColor(0)).toBe('#F87171')
    expect(dteColor(-1)).toBe('#F87171')
  })
  it('returns amber for 8–21 DTE', () => {
    expect(dteColor(8)).toBe('#F59E0B')
    expect(dteColor(21)).toBe('#F59E0B')
  })
  it('returns green for >21 DTE', () => {
    expect(dteColor(22)).toBe('#22C55E')
  })
})

describe('dteFillPercent', () => {
  it('returns 0 when opened today and expiry is in the future', () => {
    const today = new Date().toISOString().split('T')[0]
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    expect(dteFillPercent(today, future)).toBeCloseTo(0, 0)
  })
  it('returns 100 when past expiry', () => {
    const past30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const past1 = new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]
    expect(dteFillPercent(past30, past1)).toBe(100)
  })
})

describe('calcCumulativePnl', () => {
  it('returns running sum of net premiums sorted by date_closed', () => {
    const trades = [
      { date_closed: '2026-02-01', premium_in: 200, premium_out: 0, brokerage_fees: 1 },
      { date_closed: '2026-01-15', premium_in: 100, premium_out: 0, brokerage_fees: 1 },
    ] as Partial<Trade>[] as Trade[]
    const result = calcCumulativePnl(trades)
    expect(result).toEqual([
      { date: '2026-01-15', cumPnl: 99 },
      { date: '2026-02-01', cumPnl: 298 },
    ])
  })
})

describe('groupByMonth', () => {
  it('sums net premium by month label', () => {
    const trades = [
      { date_closed: '2026-01-10', premium_in: 100, premium_out: 0, brokerage_fees: 0 },
      { date_closed: '2026-01-20', premium_in: 50, premium_out: 0, brokerage_fees: 0 },
      { date_closed: '2026-02-05', premium_in: 200, premium_out: 0, brokerage_fees: 0 },
    ] as Partial<Trade>[] as Trade[]
    const result = groupByMonth(trades)
    expect(result).toEqual([
      { month: 'Jan 2026', pnl: 150 },
      { month: 'Feb 2026', pnl: 200 },
    ])
  })
})
