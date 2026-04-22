'use client'

import { useState, useMemo } from 'react'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium, calcReturnOnCapital, calcCapitalSecured } from '@/lib/calculations'
import type { Trade } from '@/types'

interface Props {
  trades: Trade[]
}

export function HistoryTable({ trades }: Props) {
  const [tickerFilter, setTickerFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const filtered = useMemo(() => {
    return trades
      .filter((t) => t.status !== 'open')
      .filter((t) => !tickerFilter || t.ticker.toUpperCase().includes(tickerFilter.toUpperCase()))
      .filter((t) => !fromDate || (t.date_closed && t.date_closed >= fromDate))
      .filter((t) => !toDate || (t.date_closed && t.date_closed <= toDate))
      .sort((a, b) => (b.date_closed ?? '').localeCompare(a.date_closed ?? ''))
  }, [trades, tickerFilter, fromDate, toDate])

  const inputCls = 'bg-bg-base border border-border rounded-md px-3 py-1.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-accent-purple/60 transition-colors'

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      {/* Filter bar */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-border">
        <input
          value={tickerFilter}
          onChange={(e) => setTickerFilter(e.target.value)}
          placeholder="Filter by ticker..."
          className={`${inputCls} w-40`}
        />
        <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
        <span className="text-text-muted text-sm">to</span>
        <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
        {(tickerFilter || fromDate || toDate) && (
          <button
            onClick={() => { setTickerFilter(''); setFromDate(''); setToDate('') }}
            className="text-xs text-text-muted hover:text-white transition-colors"
          >
            Clear
          </button>
        )}
        <span className="ml-auto text-xs text-text-muted">{filtered.length} trades</span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-text-muted text-sm px-5 py-8">No closed trades match the current filter.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Type', 'Strike', 'Expiry', 'Contracts', 'Premium In', 'Buyback', 'Net P&L', 'ROC%', 'Outcome', 'Closed'].map((h) => (
                <th key={h} className="py-2 px-4 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => {
              const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
              const cap = calcCapitalSecured(t.strike_price, t.contracts)
              const roc = calcReturnOnCapital(net, cap)
              const isLinked = !!t.linked_trade_id

              return (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors"
                >
                  <td className="py-2.5 px-4">
                    {isLinked && <span className="text-text-muted mr-1 text-xs">↳</span>}
                    <span className="font-semibold text-white text-sm">{t.ticker}</span>
                  </td>
                  <td className="py-2.5 px-4"><StrategyBadge strategy={t.strategy} /></td>
                  <td className="py-2.5 px-4 text-sm tabular-nums">${t.strike_price.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-sm text-text-muted tabular-nums">{t.expiry_date}</td>
                  <td className="py-2.5 px-4 text-sm tabular-nums text-center">{t.contracts}</td>
                  <td className="py-2.5 px-4 text-sm tabular-nums text-accent-green">+${t.premium_in.toFixed(0)}</td>
                  <td className="py-2.5 px-4 text-sm tabular-nums text-text-muted">
                    {t.premium_out > 0 ? `-$${t.premium_out.toFixed(0)}` : '—'}
                  </td>
                  <td className="py-2.5 px-4"><PnlBadge value={Math.round(net)} /></td>
                  <td className="py-2.5 px-4 text-sm tabular-nums text-accent-purple">
                    {(roc * 100).toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded border ${
                      t.status === 'assigned'
                        ? 'border-accent-amber/30 text-accent-amber bg-accent-amber/5'
                        : net >= 0
                          ? 'border-accent-green/30 text-accent-green bg-accent-green/5'
                          : 'border-accent-red/30 text-accent-red bg-accent-red/5'
                    }`}>
                      {t.status === 'assigned' ? 'Assigned' : 'Closed'}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-sm text-text-muted tabular-nums">{t.date_closed ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
