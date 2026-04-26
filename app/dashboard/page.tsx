'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { PositionsPreview } from '@/components/dashboard/PositionsPreview'
import { PnlChart } from '@/components/dashboard/PnlChart'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'
import { useFinnhubPrices } from '@/hooks/useFinnhubPrices'
import { useTastytradeQuotes } from '@/hooks/useTastytradeQuotes'
import { useTastytradeClient } from '@/hooks/useTastytradeClient'

export default function DashboardPage() {
  const { trades, openTrades, closedTrades, loading, refresh } = useTrades()
  const { client } = useTastytradeClient()
  const tickers = [...new Set(openTrades.map((t) => t.ticker))]
  const ttPrices = useTastytradeQuotes(client ? tickers : [])
  const fbPrices = useFinnhubPrices(client ? [] : tickers)
  const prices = client ? ttPrices : fbPrices
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onAddTrade={() => setPanelOpen(true)} />

      <main className="ml-52 flex-1 p-8">
        <h1 className="text-white text-xl font-semibold mb-6">Dashboard</h1>

        {loading ? (
          <div className="text-text-muted text-sm animate-pulse">Loading...</div>
        ) : (
          <>
            <StatsRow trades={trades} openTrades={openTrades} />
            <PositionsPreview openTrades={openTrades} prices={prices} />
            <PnlChart closedTrades={closedTrades} />
          </>
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
