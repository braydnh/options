import Link from 'next/link'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { DteBadge } from '@/components/ui/DteBadge'
import type { Trade } from '@/types'

interface Props {
  openTrades: Trade[]
}

export function PositionsPreview({ openTrades }: Props) {
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
              {['Ticker', 'Type', 'Strike', 'Premium', 'DTE'].map((h) => (
                <th key={h} className="py-2 px-5 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="py-2.5 px-5 text-sm font-semibold text-white">{t.ticker}</td>
                <td className="py-2.5 px-5"><StrategyBadge strategy={t.strategy} /></td>
                <td className="py-2.5 px-5 text-sm tabular-nums">${t.strike_price.toFixed(2)}</td>
                <td className="py-2.5 px-5 text-sm tabular-nums text-accent-green">+${t.premium_in.toFixed(0)}</td>
                <td className="py-2.5 px-5"><DteBadge expiryDate={t.expiry_date} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
