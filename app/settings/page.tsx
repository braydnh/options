'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { useTastytradeClient } from '@/hooks/useTastytradeClient'
import { insertTrade } from '@/lib/supabase'
import type { TradeStrategy } from '@/types'

interface ParsedTrade {
  ticker: string
  strategy: TradeStrategy
  trade_type: 'put' | 'call'
  opening_action: 'sell_to_open'
  strike_price: number
  expiry_date: string
  contracts: number
  premium_in: number
  date_opened: string
  tastytrade_order_id: string
}

export default function SettingsPage() {
  return (
    <Suspense>
      <SettingsContent />
    </Suspense>
  )
}

function SettingsContent() {
  const { client, config, loading } = useTastytradeClient()
  const searchParams = useSearchParams()

  const [callbackError, setCallbackError] = useState<string | null>(null)
  const [callbackSuccess, setCallbackSuccess] = useState(false)

  const [syncing, setSyncing] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [syncedTrades, setSyncedTrades] = useState<ParsedTrade[] | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)

  const isConnected = !loading && !!client

  useEffect(() => {
    const err = searchParams.get('error')
    const connected = searchParams.get('connected')
    if (err) setCallbackError(decodeURIComponent(err))
    if (connected === 'true') {
      setCallbackSuccess(true)
      // Reload to pick up the new client singleton
      window.history.replaceState({}, '', '/settings')
      window.location.reload()
    }
  }, [searchParams])

  async function handleSync() {
    setSyncing(true)
    setSyncError(null)
    setSyncedTrades(null)
    setImportResult(null)
    try {
      const res = await fetch('/api/tastytrade/sync')
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch {
        throw new Error(`Server error (${res.status})`)
      }
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      setSyncedTrades(data.trades)
      setSelected(new Set(data.trades.map((t: ParsedTrade) => t.tastytrade_order_id)))
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  async function handleImport() {
    if (!syncedTrades) return
    setImporting(true)
    setImportResult(null)
    const toImport = syncedTrades.filter((t) => selected.has(t.tastytrade_order_id))
    let count = 0
    for (const trade of toImport) {
      try {
        await insertTrade({
          date_opened: trade.date_opened,
          ticker: trade.ticker,
          strategy: trade.strategy,
          trade_type: trade.trade_type,
          opening_action: trade.opening_action,
          closing_action: null,
          strike_price: trade.strike_price,
          contracts: trade.contracts,
          expiry_date: trade.expiry_date,
          premium_in: trade.premium_in,
          premium_out: 0,
          brokerage_fees: 0,
          status: 'open',
          assignment_status: null,
          shares: null,
          cost_basis: null,
          linked_trade_id: null,
          notes: `Imported from tastytrade (order ${trade.tastytrade_order_id})`,
          date_closed: null,
          delta: null,
          iv: null,
          underlying_price_at_open: null,
          underlying_price_at_close: null,
        })
        count++
      } catch { /* continue */ }
    }
    setImporting(false)
    setImportResult(`${count} of ${toImport.length} trade${toImport.length !== 1 ? 's' : ''} imported.`)
    setSyncedTrades(null)
    setSelected(new Set())
  }

  function toggleAll() {
    if (!syncedTrades) return
    if (selected.size === syncedTrades.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(syncedTrades.map((t) => t.tastytrade_order_id)))
    }
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onAddTrade={() => {}} />

      <main className="ml-52 flex-1 p-8 max-w-2xl">
        <h1 className="text-white text-xl font-semibold mb-8">Settings</h1>

        {/* tastytrade Connection */}
        <section className="bg-bg-panel border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-medium">tastytrade</h2>
            {!loading && (
              <span className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-green-400' : 'text-text-muted'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400' : 'bg-text-muted'}`} />
                {isConnected ? `Connected · ${config?.accountNumber}` : 'Not connected'}
              </span>
            )}
          </div>

          {callbackError && (
            <p className="text-red-400 text-sm mb-4">Connection failed: {callbackError}</p>
          )}
          {callbackSuccess && (
            <p className="text-green-400 text-sm mb-4">Connected successfully!</p>
          )}

          {!isConnected ? (
            <div className="flex flex-col gap-3">
              <p className="text-text-muted text-sm">
                Click below to log in with tastytrade. You&apos;ll be redirected to their site and back — we never see your password.
              </p>
              <a
                href="/api/tastytrade/authorize"
                className="inline-flex items-center justify-center py-2 px-4 bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-medium rounded-md transition-colors"
              >
                Connect with tastytrade →
              </a>
            </div>
          ) : (
            <p className="text-text-muted text-sm">
              Live quotes from tastytrade are active on positions and dashboard.
            </p>
          )}
        </section>

        {/* Sync Trades */}
        {isConnected && (
          <section className="bg-bg-panel border border-border rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-white font-medium mb-1">Sync Recent Trades</h2>
                <p className="text-text-muted text-xs">
                  Fetch your last 90 days of filled Sell-to-Open options orders from tastytrade.
                </p>
              </div>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="py-1.5 px-4 bg-bg-hover border border-border hover:border-accent-purple/50 text-white text-sm rounded-md transition-colors disabled:opacity-50 shrink-0"
              >
                {syncing ? 'Fetching...' : 'Fetch Orders'}
              </button>
            </div>

            {syncError && <p className="text-red-400 text-sm mt-2">{syncError}</p>}
            {importResult && <p className="text-green-400 text-sm mt-2">{importResult}</p>}

            {syncedTrades && syncedTrades.length === 0 && (
              <p className="text-text-muted text-sm mt-2">No filled Sell-to-Open options orders found in the last 90 days.</p>
            )}

            {syncedTrades && syncedTrades.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <button onClick={toggleAll} className="text-xs text-text-muted hover:text-white transition-colors">
                    {selected.size === syncedTrades.length ? 'Deselect all' : 'Select all'} ({syncedTrades.length})
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={importing || selected.size === 0}
                    className="py-1 px-3 bg-accent-purple hover:bg-accent-purple/80 text-white text-xs rounded-md transition-colors disabled:opacity-50"
                  >
                    {importing ? 'Importing...' : `Import ${selected.size} trade${selected.size !== 1 ? 's' : ''}`}
                  </button>
                </div>

                <div className="border border-border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="w-8 px-3 py-2 text-left"></th>
                        <th className="px-3 py-2 text-left text-text-muted font-normal">Ticker</th>
                        <th className="px-3 py-2 text-left text-text-muted font-normal">Type</th>
                        <th className="px-3 py-2 text-left text-text-muted font-normal">Strike</th>
                        <th className="px-3 py-2 text-left text-text-muted font-normal">Expiry</th>
                        <th className="px-3 py-2 text-right text-text-muted font-normal">Premium</th>
                        <th className="px-3 py-2 text-left text-text-muted font-normal">Opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {syncedTrades.map((trade) => (
                        <tr
                          key={trade.tastytrade_order_id}
                          className="border-b border-border last:border-0 hover:bg-bg-hover cursor-pointer"
                          onClick={() => {
                            const next = new Set(selected)
                            if (next.has(trade.tastytrade_order_id)) {
                              next.delete(trade.tastytrade_order_id)
                            } else {
                              next.add(trade.tastytrade_order_id)
                            }
                            setSelected(next)
                          }}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(trade.tastytrade_order_id)}
                              onChange={() => {}}
                              className="accent-purple-500"
                            />
                          </td>
                          <td className="px-3 py-2 text-white font-medium">{trade.ticker}</td>
                          <td className="px-3 py-2 text-text-muted">
                            {trade.trade_type === 'put' ? 'CSP' : 'CC'}
                          </td>
                          <td className="px-3 py-2 text-white">${trade.strike_price}</td>
                          <td className="px-3 py-2 text-text-muted">{trade.expiry_date}</td>
                          <td className="px-3 py-2 text-right text-green-400">
                            ${trade.premium_in.toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-text-muted">{trade.date_opened}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
