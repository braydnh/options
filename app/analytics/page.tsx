'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { CumulativePnlChart } from '@/components/analytics/CumulativePnlChart'
import { MonthlyPnlChart } from '@/components/analytics/MonthlyPnlChart'
import { WinRateDonut } from '@/components/analytics/WinRateDonut'
import { TickerBreakdownTable } from '@/components/analytics/TickerBreakdownTable'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'

export default function AnalyticsPage() {
  const { openTrades, closedTrades, loading, refresh } = useTrades()
  const [panelOpen, setPanelOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-bg-base">
      <Sidebar onAddTrade={() => setPanelOpen(true)} />

      <main className="ml-52 flex-1 p-8">
        <h1 className="text-white text-xl font-semibold mb-6">Analytics</h1>

        {loading ? (
          <div className="text-text-muted text-sm animate-pulse">Loading...</div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <CumulativePnlChart closedTrades={closedTrades} />
              <MonthlyPnlChart closedTrades={closedTrades} />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <WinRateDonut closedTrades={closedTrades} />
              <div className="col-span-2">
                <TickerBreakdownTable closedTrades={closedTrades} />
              </div>
            </div>
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
