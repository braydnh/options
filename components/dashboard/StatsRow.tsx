import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium, calcCapitalSecured, calcUnrealizedPnl } from '@/lib/calculations'
import type { Trade, PriceMap } from '@/types'

interface Props {
  trades: Trade[]
  openTrades: Trade[]
  assignedTrades: Trade[]
  prices: PriceMap
}

export function StatsRow({ trades, openTrades, assignedTrades, prices }: Props) {
  const closedTrades = trades.filter((t) => t.status === 'closed')

  // Realised: all fully closed trades
  const realisedPnl = closedTrades.reduce(
    (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
    0
  )

  // Unrealised options: open positions where we have a live price
  const unrealisedOptions = openTrades.reduce((sum, t) => {
    const price = prices[t.ticker]
    if (price === undefined) return sum
    return sum + calcUnrealizedPnl(t.strategy, t.premium_in, t.strike_price, t.contracts, price)
  }, 0)

  // Unrealised shares: assigned holdings where we have a live price
  const unrealisedShares = assignedTrades.reduce((sum, t) => {
    const price = prices[t.ticker]
    if (price === undefined) return sum
    const shares = t.shares ?? t.contracts * 100
    const costBasis = t.cost_basis ?? (t.strike_price - t.premium_in / shares)
    return sum + (price - costBasis) * shares
  }, 0)

  const unrealisedPnl = unrealisedOptions + unrealisedShares
  const netTotal = realisedPnl + unrealisedPnl

  const totalCapital = openTrades.reduce(
    (sum, t) => sum + calcCapitalSecured(t.strike_price, t.contracts),
    0
  )

  const { thisMonthPnl, thisMonthPct } = (() => {
    const now = new Date()
    const monthTrades = closedTrades.filter((t) => {
      if (!t.date_closed) return false
      const d = new Date(t.date_closed)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    const pnl = monthTrades.reduce(
      (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
      0
    )
    const cap = monthTrades.reduce(
      (sum, t) => sum + calcCapitalSecured(t.strike_price, t.contracts),
      0
    )
    return { thisMonthPnl: pnl, thisMonthPct: cap > 0 ? (pnl / cap) * 100 : null }
  })()

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <StatCard label="Realised P&L">
        <PnlBadge value={Math.round(realisedPnl)} className="text-xl" />
      </StatCard>

      <StatCard label="Unrealised P&L">
        <PnlBadge value={Math.round(unrealisedPnl)} className="text-xl" />
      </StatCard>

      <StatCard label="Net Total">
        <PnlBadge value={Math.round(netTotal)} className="text-xl" />
      </StatCard>

      <StatCard label="Capital Allocated">
        <span className="text-white text-xl font-semibold">
          ${totalCapital.toLocaleString('en-AU')}
        </span>
      </StatCard>

      <StatCard label="This Month">
        <div className="flex items-baseline gap-2">
          <PnlBadge value={Math.round(thisMonthPnl)} className="text-xl" />
          {thisMonthPct !== null && (
            <span className={`text-sm font-medium ${thisMonthPct >= 0 ? 'text-accent-green/70' : 'text-accent-red/70'}`}>
              {thisMonthPct >= 0 ? '+' : ''}{thisMonthPct.toFixed(2)}%
            </span>
          )}
        </div>
      </StatCard>

      <StatCard label="Open Positions">
        <span className="text-white text-xl font-semibold">{openTrades.length}</span>
      </StatCard>
    </div>
  )
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-panel border border-border rounded-lg p-4">
      <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">{label}</p>
      {children}
    </div>
  )
}
