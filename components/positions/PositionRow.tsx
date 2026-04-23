'use client'

import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { PnlBadge } from '@/components/ui/PnlBadge'
import { DteBar } from '@/components/ui/DteBar'
import { calcUnrealizedPnl, calcCapitalSecured } from '@/lib/calculations'
import type { Trade, TradePanelMode } from '@/types'

interface Props {
  trade: Trade
  livePrice: number | undefined
  onAction: (trade: Trade, mode: TradePanelMode) => void
}

export function PositionRow({ trade, livePrice, onAction }: Props) {
  const unrealizedPnl =
    livePrice !== undefined
      ? calcUnrealizedPnl(
          trade.strategy,
          trade.premium_in,
          trade.strike_price,
          trade.contracts,
          livePrice
        )
      : null

  const capital = calcCapitalSecured(trade.strike_price, trade.contracts)
  const unrealizedPct = unrealizedPnl !== null && capital > 0
    ? (unrealizedPnl / capital) * 100
    : null

  return (
    <tr className="border-b border-border hover:bg-bg-hover transition-colors group">
      <td className="py-3 px-4">
        <span className="font-semibold text-white">{trade.ticker}</span>
      </td>
      <td className="py-3 px-4">
        <StrategyBadge strategy={trade.strategy} />
      </td>
      <td className="py-3 px-4 text-sm tabular-nums text-text-muted">
        {new Date(trade.date_opened).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: '2-digit' })}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        ${trade.strike_price.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {livePrice !== undefined ? (
          <span className="text-white">${livePrice.toFixed(2)}</span>
        ) : (
          <span className="text-text-muted animate-pulse">···</span>
        )}
      </td>
      <td className="py-3 px-4">
        <PnlBadge value={trade.premium_in} />
      </td>
      <td className="py-3 px-4">
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
      <td className="py-3 px-4 text-sm tabular-nums text-text-muted">
        ${capital.toLocaleString('en-AU')}
      </td>
      <td className="py-3 px-4">
        {trade.delta !== null && trade.delta !== undefined ? (
          <span className="text-sm tabular-nums text-accent-purple">{trade.delta.toFixed(2)}</span>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        {trade.iv !== null && trade.iv !== undefined ? (
          <span className="text-sm tabular-nums text-accent-amber">{trade.iv.toFixed(1)}%</span>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <DteBar dateOpened={trade.date_opened} expiryDate={trade.expiry_date} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton onClick={() => onAction(trade, 'edit')} label="Edit" />
          <ActionButton onClick={() => onAction(trade, 'close')} label="Close" />
          <ActionButton onClick={() => onAction(trade, 'assign')} label="Assign" />
          <ActionButton onClick={() => onAction(trade, 'roll')} label="Roll" />
        </div>
      </td>
    </tr>
  )
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs text-text-muted border border-border rounded hover:text-white hover:border-accent-purple/50 transition-colors"
    >
      {label}
    </button>
  )
}
