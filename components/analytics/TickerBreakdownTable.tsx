import { calcNetPremium, calcReturnOnCapital, calcCapitalSecured } from '@/lib/calculations'
import type { Trade } from '@/types'

export function TickerBreakdownTable({ closedTrades }: { closedTrades: Trade[] }) {
  const byTicker = new Map<string, Trade[]>()
  for (const t of closedTrades) {
    const arr = byTicker.get(t.ticker) ?? []
    arr.push(t)
    byTicker.set(t.ticker, arr)
  }

  const rows = Array.from(byTicker.entries())
    .map(([ticker, trades]) => {
      const totalNet = trades.reduce(
        (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
        0
      )
      const avgRoc =
        trades.reduce((sum, t) => {
          const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
          const cap = calcCapitalSecured(t.strike_price, t.contracts)
          return sum + calcReturnOnCapital(net, cap)
        }, 0) / trades.length
      const wins = trades.filter(
        (t) => calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees) > 0
      ).length

      return { ticker, count: trades.length, totalNet, avgRoc, wins }
    })
    .sort((a, b) => b.totalNet - a.totalNet)

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-white">Per-Ticker Breakdown</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-text-muted text-sm px-5 py-6">No closed trades yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Trades', 'Net Premium', 'Avg ROC%', 'Win Rate'].map((h) => (
                <th key={h} className="py-2 px-5 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
                <td className="py-2.5 px-5 font-semibold text-white text-sm">{r.ticker}</td>
                <td className="py-2.5 px-5 text-sm tabular-nums">{r.count}</td>
                <td className="py-2.5 px-5">
                  <span className={`text-sm tabular-nums font-medium ${r.totalNet >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {r.totalNet >= 0 ? '+' : ''}${Math.round(r.totalNet).toLocaleString()}
                  </span>
                </td>
                <td className="py-2.5 px-5 text-sm tabular-nums text-accent-purple">
                  {(r.avgRoc * 100).toFixed(2)}%
                </td>
                <td className="py-2.5 px-5 text-sm tabular-nums">
                  {Math.round((r.wins / r.count) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
