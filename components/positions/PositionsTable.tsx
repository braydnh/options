'use client'

import { PositionRow } from './PositionRow'
import type { Trade, TradePanelMode, PriceMap } from '@/types'

interface Props {
  trades: Trade[]
  prices: PriceMap
  onAction: (trade: Trade, mode: TradePanelMode) => void
  onDelete: (trade: Trade) => void
}

const HEADERS = ['Ticker', 'Type', 'Qty', 'Opened', 'Strike', 'Live Price', 'Premium In', 'Unreal. P&L', 'vs B&H', 'Capital', 'Delta', 'IV%', 'DTE', 'Actions']

export function PositionsTable({ trades, prices, onAction, onDelete }: Props) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        No open positions. Click <span className="text-accent-purple">+ New Trade</span> to get started.
      </div>
    )
  }

  const sorted = [...trades].sort((a, b) => {
    const dteA = new Date(a.expiry_date).getTime()
    const dteB = new Date(b.expiry_date).getTime()
    return dteA - dteB
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="py-2 px-4 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((trade) => (
            <PositionRow
              key={trade.id}
              trade={trade}
              livePrice={prices[trade.ticker]}
              onAction={onAction}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
