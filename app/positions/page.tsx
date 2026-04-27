'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { PositionsTable } from '@/components/positions/PositionsTable'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'
import { useFinnhubPrices } from '@/hooks/useFinnhubPrices'
import type { Trade, TradePanelMode } from '@/types'

export default function PositionsPage() {
  const { openTrades, loading, refresh } = useTrades()
  const tickers = [...new Set(openTrades.map((t) => t.ticker))]
  const prices = useFinnhubPrices(tickers)

  const [panelOpen, setPanelOpen] = useState(false)
  const [panelMode, setPanelMode] = useState<TradePanelMode>('open')
  const [activeTrade, setActiveTrade] = useState<Trade | undefined>()

  function openNew() {
    setPanelMode('open')
    setActiveTrade(undefined)
    setPanelOpen(true)
  }

  function handleAction(trade: Trade, mode: TradePanelMode) {
    setPanelMode(mode)
    setActiveTrade(trade)
    setPanelOpen(true)
  }

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onAddTrade={openNew} />

      <main className="ml-52 flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-semibold">Open Positions</h1>
          <span className="text-text-muted text-sm">{openTrades.length} active</span>
        </div>

        {loading ? (
          <div className="text-text-muted text-sm animate-pulse">Loading positions...</div>
        ) : (
          <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
            <PositionsTable
              trades={openTrades}
              prices={prices}
              onAction={handleAction}
            />
          </div>
        )}
      </main>

      <TradePanel
        isOpen={panelOpen}
        mode={panelMode}
        trade={activeTrade}
        openTrades={openTrades}
        onClose={() => setPanelOpen(false)}
        onSuccess={refresh}
      />
    </div>
  )
}
