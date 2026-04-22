import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium, calcCapitalSecured, calcReturnOnCapital } from '@/lib/calculations'
import type { Trade } from '@/types'

interface Props {
  trades: Trade[]
  openTrades: Trade[]
}

export function StatsRow({ trades, openTrades }: Props) {
  const closedTrades = trades.filter((t) => t.status !== 'open')

  const totalPnl = closedTrades.reduce(
    (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
    0
  )

  const totalCapital = openTrades.reduce(
    (sum, t) => sum + calcCapitalSecured(t.strike_price, t.contracts),
    0
  )

  const winCount = closedTrades.filter(
    (t) => calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees) > 0
  ).length
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0

  const avgRoc = (() => {
    if (closedTrades.length === 0) return null
    const total = closedTrades.reduce((sum, t) => {
      const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
      const cap = calcCapitalSecured(t.strike_price, t.contracts)
      return sum + calcReturnOnCapital(net, cap)
    }, 0)
    return (total / closedTrades.length) * 100
  })()

  const { thisMonthPnl, thisMonthCapital } = (() => {
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
    return { thisMonthPnl: pnl, thisMonthCapital: cap }
  })()

  const thisMonthPct = thisMonthCapital > 0 ? (thisMonthPnl / thisMonthCapital) * 100 : null

  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      {/* Row 1 */}
      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">Total P&L</p>
        <PnlBadge value={Math.round(totalPnl)} className="text-xl" />
      </div>

      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">Capital Allocated</p>
        <span className="text-white text-xl font-semibold">
          ${totalCapital.toLocaleString('en-AU')}
        </span>
      </div>

      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">Open Positions</p>
        <span className="text-white text-xl font-semibold">{openTrades.length}</span>
      </div>

      {/* Row 2 */}
      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">This Month</p>
        <div className="flex items-baseline gap-2">
          <PnlBadge value={Math.round(thisMonthPnl)} className="text-xl" />
          {thisMonthPct !== null && (
            <span className={`text-sm font-medium ${thisMonthPct >= 0 ? 'text-accent-green/70' : 'text-accent-red/70'}`}>
              {thisMonthPct >= 0 ? '+' : ''}{thisMonthPct.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">Avg ROC</p>
        <span className={`text-xl font-semibold ${avgRoc !== null && avgRoc >= 0 ? 'text-accent-purple' : 'text-accent-red'}`}>
          {avgRoc !== null ? `${avgRoc >= 0 ? '+' : ''}${avgRoc.toFixed(2)}%` : '—'}
        </span>
      </div>

      <div className="bg-bg-panel border border-border rounded-lg p-4">
        <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">Win Rate</p>
        <span className="text-accent-purple text-xl font-semibold">
          {closedTrades.length > 0 ? `${Math.round(winRate)}%` : '—'}
        </span>
      </div>
    </div>
  )
}
