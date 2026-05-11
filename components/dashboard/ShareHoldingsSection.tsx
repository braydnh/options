'use client'

import { useState } from 'react'
import { updateTrade } from '@/lib/supabase'
import type { Trade, PriceMap } from '@/types'

interface Props {
  assignedTrades: Trade[]
  prices: PriceMap
  onRefresh: () => void
}

export function ShareHoldingsSection({ assignedTrades, prices, onRefresh }: Props) {
  if (assignedTrades.length === 0) return null

  return (
    <section className="mb-8">
      <h2 className="text-white text-sm font-medium mb-3">Share Holdings</h2>
      <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Shares', 'Cost Basis', 'Current Price', 'Unrealized P&L', 'Total Value', 'Actions'].map((h) => (
                <th key={h} className="py-2 px-4 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignedTrades.map((trade) => (
              <HoldingRow key={trade.id} trade={trade} prices={prices} onRefresh={onRefresh} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function HoldingRow({ trade, prices, onRefresh }: { trade: Trade; prices: PriceMap; onRefresh: () => void }) {
  const [selling, setSelling] = useState(false)
  const [salePrice, setSalePrice] = useState('')
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const shares = trade.shares ?? trade.contracts * 100
  // Cost basis per share: stored value, or strike minus premium-per-share
  const costBasisPerShare = trade.cost_basis ?? (trade.strike_price - trade.premium_in / shares)
  const currentPrice = prices[trade.ticker]
  const unrealizedPnl = currentPrice !== undefined ? (currentPrice - costBasisPerShare) * shares : null
  const totalValue = currentPrice !== undefined ? currentPrice * shares : null

  async function handleSell(e: React.FormEvent) {
    e.preventDefault()
    const price = parseFloat(salePrice)
    if (!price) return
    setSubmitting(true)
    try {
      await updateTrade(trade.id, {
        status: 'closed',
        date_closed: saleDate,
        underlying_price_at_close: price,
        closing_action: 'shares_sold',
      })
      onRefresh()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <tr className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors group">
      <td className="py-3 px-4 font-semibold text-white">{trade.ticker}</td>
      <td className="py-3 px-4 text-sm text-text-muted tabular-nums">{shares.toLocaleString()}</td>
      <td className="py-3 px-4 text-sm tabular-nums text-white">${costBasisPerShare.toFixed(2)}</td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {currentPrice !== undefined ? (
          <span className="text-white">${currentPrice.toFixed(2)}</span>
        ) : (
          <span className="text-text-muted animate-pulse">···</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {unrealizedPnl !== null ? (
          <span className={unrealizedPnl >= 0 ? 'text-accent-green font-medium' : 'text-accent-red font-medium'}>
            {unrealizedPnl >= 0 ? '+' : ''}${Math.round(unrealizedPnl).toLocaleString()}
          </span>
        ) : (
          <span className="text-text-muted">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums text-text-muted">
        {totalValue !== null ? `$${Math.round(totalValue).toLocaleString()}` : '—'}
      </td>
      <td className="py-3 px-4">
        {selling ? (
          <form onSubmit={handleSell} className="flex items-center gap-2">
            <input
              autoFocus
              type="number"
              step="0.01"
              min="0"
              placeholder="Sale price"
              value={salePrice}
              onChange={(e) => setSalePrice(e.target.value)}
              className="w-24 bg-bg-base border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent-purple/60"
            />
            <input
              type="date"
              value={saleDate}
              onChange={(e) => setSaleDate(e.target.value)}
              className="w-32 bg-bg-base border border-border rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-accent-purple/60"
            />
            <button
              type="submit"
              disabled={submitting}
              className="px-2 py-1 text-xs bg-accent-purple/80 hover:bg-accent-purple text-white rounded transition-colors disabled:opacity-50"
            >
              {submitting ? '…' : 'Confirm'}
            </button>
            <button
              type="button"
              onClick={() => setSelling(false)}
              className="px-2 py-1 text-xs text-text-muted border border-border rounded hover:text-white transition-colors"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            onClick={() => setSelling(true)}
            className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-text-muted border border-border rounded hover:text-white hover:border-accent-purple/50 transition-colors"
          >
            Sell Shares
          </button>
        )}
      </td>
    </tr>
  )
}
