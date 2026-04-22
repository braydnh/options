'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { HistoryTable } from '@/components/history/HistoryTable'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'

export default function HistoryPage() {
  const { trades, openTrades, closedTrades, loading, refresh } = useTrades()
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onAddTrade={() => setPanelOpen(true)} />

      <main className="ml-52 flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-white text-xl font-semibold">Trade History</h1>
          <span className="text-text-muted text-sm">{closedTrades.length} closed trades</span>
        </div>

        {loading ? (
          <div className="text-text-muted text-sm animate-pulse">Loading...</div>
        ) : (
          <HistoryTable trades={trades} />
        )}
      </main>

      <TradePanel
        isOpen={panelOpen}
        mode="open"
        openTrades={openTrades}
        onClose={() => setPanelOpen(false)}
        onSuccess={refresh}
      />
    </div>
  )
}
