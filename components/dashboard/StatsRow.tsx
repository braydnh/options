import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium, calcCapitalSecured } from '@/lib/calculations'
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

  const thisMonth = (() => {
    const now = new Date()
    return closedTrades
      .filter((t) => {
        if (!t.date_closed) return false
        const d = new Date(t.date_closed)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees), 0)
  })()

  const stats = [
    { label: 'TOTAL P&L', value: <PnlBadge value={Math.round(totalPnl)} className="text-xl" /> },
    {
      label: 'CAPITAL ALLOCATED',
      value: (
        <span className="text-white text-xl font-semibold">
          ${totalCapital.toLocaleString('en-AU')}
        </span>
      ),
    },
    { label: 'OPEN POSITIONS', value: <span className="text-white text-xl font-semibold">{openTrades.length}</span> },
    {
      label: 'WIN RATE',
      value: (
        <span className="text-accent-purple text-xl font-semibold">
          {closedTrades.length > 0 ? `${Math.round(winRate)}%` : '—'}
        </span>
      ),
    },
    { label: 'THIS MONTH', value: <PnlBadge value={Math.round(thisMonth)} className="text-xl" /> },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-8">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-bg-panel border border-border rounded-lg p-4">
          <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">{label}</p>
          {value}
        </div>
      ))}
    </div>
  )
}
