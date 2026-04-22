'use client'

import { TradePanelForm } from './TradePanelForm'
import type { Trade, TradePanelMode } from '@/types'

interface TradePanelProps {
  isOpen: boolean
  mode: TradePanelMode
  trade?: Trade
  openTrades: Trade[]
  onClose: () => void
  onSuccess: () => void
}

const TITLES: Record<TradePanelMode, string> = {
  open: 'New Trade',
  close: 'Close Trade',
  assign: 'Mark as Assigned',
  roll: 'Roll Trade',
}

export function TradePanel({
  isOpen,
  mode,
  trade,
  openTrades,
  onClose,
  onSuccess,
}: TradePanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity duration-200 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className={`
          fixed right-0 top-0 h-screen w-80 bg-bg-panel border-l border-border z-30
          flex flex-col overflow-y-auto
          transition-transform duration-200 ease-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-white font-semibold text-sm">{TITLES[mode]}</h2>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-xl leading-none transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-5 py-4">
          {mode === 'open' && (
            <TradePanelForm
              openTrades={openTrades}
              onSuccess={() => { onSuccess(); onClose() }}
              onCancel={onClose}
            />
          )}
          {(mode === 'close' || mode === 'assign' || mode === 'roll') && trade && (
            <div className="text-text-muted text-sm">
              Close/Assign/Roll form — implemented in Task 11.
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
