'use client'

import { useState } from 'react'
import { TradePanelForm } from './TradePanelForm'
import { updateTrade, insertTrade } from '@/lib/supabase'
import type { Trade, TradePanelMode, TradeStrategy } from '@/types'

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
            <CloseAssignForm
              mode={mode}
              trade={trade}
              onSuccess={() => { onSuccess(); onClose() }}
              onCancel={onClose}
            />
          )}
        </div>
      </aside>
    </>
  )
}

// ─────────────────────────────────────────────────────────────
// CloseAssignForm — handles close, assign, and roll modes
// ─────────────────────────────────────────────────────────────

interface CloseAssignFormProps {
  mode: 'close' | 'assign' | 'roll'
  trade: Trade
  onSuccess: () => void
  onCancel: () => void
}

function CloseAssignForm({ mode, trade, onSuccess, onCancel }: CloseAssignFormProps) {
  const [premiumOut, setPremiumOut] = useState('')
  const [dateClosed, setDateClosed] = useState(new Date().toISOString().split('T')[0])
  const [shares, setShares] = useState(String(trade.contracts * 100))
  const [costBasis, setCostBasis] = useState(String(trade.strike_price))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Roll-specific fields
  const [rollStrategy, setRollStrategy] = useState<TradeStrategy>(
    trade.strategy === 'cash_secured_put' ? 'covered_call' : 'cash_secured_put'
  )
  const [rollStrike, setRollStrike] = useState(String(trade.strike_price))
  const [rollExpiry, setRollExpiry] = useState('')
  const [rollPremium, setRollPremium] = useState('')

  async function handleClose(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateTrade(trade.id, {
        status: 'closed',
        premium_out: parseFloat(premiumOut) || 0,
        date_closed: dateClosed,
        closing_action: 'buy_to_close',
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close trade')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateTrade(trade.id, {
        status: 'assigned',
        assignment_status: 'assigned',
        date_closed: dateClosed,
        shares: parseInt(shares),
        cost_basis: parseFloat(costBasis),
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as assigned')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleRoll(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await updateTrade(trade.id, {
        status: 'closed',
        premium_out: parseFloat(premiumOut) || 0,
        date_closed: dateClosed,
        closing_action: 'buy_to_close',
      })
      await insertTrade({
        date_opened: dateClosed,
        ticker: trade.ticker,
        strategy: rollStrategy,
        trade_type: rollStrategy === 'cash_secured_put' ? 'put' : 'call',
        opening_action: 'sell_to_open',
        closing_action: null,
        strike_price: parseFloat(rollStrike),
        contracts: trade.contracts,
        expiry_date: rollExpiry,
        premium_in: parseFloat(rollPremium) || 0,
        premium_out: 0,
        brokerage_fees: 0,
        status: 'open',
        assignment_status: null,
        shares: null,
        cost_basis: null,
        linked_trade_id: trade.id,
        notes: `Rolled from ${trade.ticker} ${trade.strategy === 'cash_secured_put' ? 'CSP' : 'CC'} $${trade.strike_price}`,
        date_closed: null,
      })
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to roll trade')
    } finally {
      setSubmitting(false)
    }
  }

  const TradeSummary = () => (
    <div className="bg-bg-base border border-border rounded-md px-3 py-2 mb-4 text-xs text-text-muted">
      <span className="text-white font-medium">{trade.ticker}</span>
      {' · '}
      {trade.strategy === 'cash_secured_put' ? 'CSP' : 'CC'}
      {' · '}
      ${trade.strike_price}
      {' · '}
      {trade.contracts} contract{trade.contracts > 1 ? 's' : ''}
    </div>
  )

  const Buttons = ({ submitLabel }: { submitLabel: string }) => (
    <div className="flex gap-2 pt-2">
      <button
        type="button"
        onClick={onCancel}
        className="flex-1 py-2 rounded-md border border-border text-text-muted text-sm hover:text-white transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="flex-1 py-2 rounded-md bg-accent-purple hover:bg-accent-purple/80 text-white text-sm font-medium transition-colors disabled:opacity-50"
      >
        {submitting ? 'Saving...' : submitLabel}
      </button>
    </div>
  )

  if (mode === 'close') {
    return (
      <form onSubmit={handleClose} className="flex flex-col gap-4">
        <TradeSummary />
        <Field label="BUYBACK COST ($)">
          <input
            type="number"
            step="0.01"
            min={0}
            value={premiumOut}
            onChange={(e) => setPremiumOut(e.target.value)}
            placeholder="0.00 (expired worthless)"
            className={inputCls}
          />
        </Field>
        <Field label="DATE CLOSED">
          <input
            required
            type="date"
            value={dateClosed}
            onChange={(e) => setDateClosed(e.target.value)}
            className={inputCls}
          />
        </Field>
        {error && <p className="text-accent-red text-xs">{error}</p>}
        <Buttons submitLabel="Close Trade" />
      </form>
    )
  }

  if (mode === 'assign') {
    return (
      <form onSubmit={handleAssign} className="flex flex-col gap-4">
        <TradeSummary />
        <Field label="SHARES ASSIGNED">
          <input
            required
            type="number"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="COST BASIS PER SHARE ($)">
          <input
            required
            type="number"
            step="0.01"
            value={costBasis}
            onChange={(e) => setCostBasis(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="DATE ASSIGNED">
          <input
            required
            type="date"
            value={dateClosed}
            onChange={(e) => setDateClosed(e.target.value)}
            className={inputCls}
          />
        </Field>
        {error && <p className="text-accent-red text-xs">{error}</p>}
        <Buttons submitLabel="Mark Assigned" />
      </form>
    )
  }

  // Roll mode
  return (
    <form onSubmit={handleRoll} className="flex flex-col gap-4">
      <TradeSummary />
      <p className="text-xs text-text-muted">Close the current position and open a new one in one action.</p>
      <Field label="BUYBACK COST ($)">
        <input
          type="number"
          step="0.01"
          min={0}
          value={premiumOut}
          onChange={(e) => setPremiumOut(e.target.value)}
          placeholder="0.00"
          className={inputCls}
        />
      </Field>
      <Field label="NEW STRATEGY">
        <select
          value={rollStrategy}
          onChange={(e) => setRollStrategy(e.target.value as TradeStrategy)}
          className={inputCls}
        >
          <option value="cash_secured_put">Cash-Secured Put</option>
          <option value="covered_call">Covered Call</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="NEW STRIKE">
          <input
            required
            type="number"
            step="0.01"
            value={rollStrike}
            onChange={(e) => setRollStrike(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="NEW EXPIRY">
          <input
            required
            type="date"
            value={rollExpiry}
            onChange={(e) => setRollExpiry(e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>
      <Field label="NEW PREMIUM ($)">
        <input
          required
          type="number"
          step="0.01"
          value={rollPremium}
          onChange={(e) => setRollPremium(e.target.value)}
          className={inputCls}
        />
      </Field>
      <Field label="DATE ROLLED">
        <input
          required
          type="date"
          value={dateClosed}
          onChange={(e) => setDateClosed(e.target.value)}
          className={inputCls}
        />
      </Field>
      {error && <p className="text-accent-red text-xs">{error}</p>}
      <Buttons submitLabel="Roll Trade" />
    </form>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[10px] tracking-widest text-text-muted mb-1.5 uppercase">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls =
  'w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-dim focus:outline-none focus:border-accent-purple/60 transition-colors'
