import Link from 'next/link'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { DteBadge } from '@/components/ui/DteBadge'
import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcUnrealizedPnl, calcCapitalSecured } from '@/lib/calculations'
import type { Trade, PriceMap } from '@/types'

interface Props {
  openTrades: Trade[]
  prices: PriceMap
}

export function PositionsPreview({ openTrades, prices }: Props) {
  const sorted = [...openTrades]
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 5)

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-white">Open Positions</h2>
        <Link href="/positions" className="text-xs text-accent-purple hover:underline">
          View all →
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="text-text-muted text-sm px-5 py-6">No open positions.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Type', 'Opened', 'Strike', 'Live Price', 'Premium', 'Unreal. P&L', 'DTE'].map((h) => (
                <th key={h} className="py-2 px-5 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => {
              const livePrice = prices[t.ticker]
              const unrealizedPnl = livePrice !== undefined
                ? calcUnrealizedPnl(t.strategy, t.premium_in, t.strike_price, t.contracts, livePrice)
                : null
              const capital = calcCapitalSecured(t.strike_price, t.contracts)
              const unrealizedPct = unrealizedPnl !== null && capital > 0
                ? (unrealizedPnl / capital) * 100
                : null

              return (
                <tr key={t.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 px-5 text-sm font-semibold text-white">{t.ticker}</td>
                  <td className="py-2.5 px-5"><StrategyBadge strategy={t.strategy} /></td>
                  <td className="py-2.5 px-5 text-sm tabular-nums text-text-muted">
                    {new Date(t.date_opened).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="py-2.5 px-5 text-sm tabular-nums">${t.strike_price.toFixed(2)}</td>
                  <td className="py-2.5 px-5 text-sm tabular-nums">
                    {livePrice !== undefined
                      ? <span className="text-white">${livePrice.toFixed(2)}</span>
                      : <span className="text-text-muted animate-pulse">···</span>
                    }
                  </td>
                  <td className="py-2.5 px-5 text-sm tabular-nums text-accent-green">+${t.premium_in.toFixed(0)}</td>
                  <td className="py-2.5 px-5">
                    {unrealizedPnl !== null ? (
                      <div className="flex flex-col gap-0.5">
                        <PnlBadge value={Math.round(unrealizedPnl)} />
                        {unrealizedPct !== null && (
                          <span className={`text-[10px] tabular-nums ${unrealizedPct >= 0 ? 'text-accent-green/70' : 'text-accent-red/70'}`}>
                            {unrealizedPct >= 0 ? '+' : ''}{unrealizedPct.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted text-sm">—</span>
                    )}
                  </td>
                  <td className="py-2.5 px-5"><DteBadge expiryDate={t.expiry_date} /></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
