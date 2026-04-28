'use client'

import { useState } from 'react'
import { insertTrade, updateTrade } from '@/lib/supabase'
import type { Trade, NewTradeInput, TradeStrategy } from '@/types'

interface Props {
  openTrades: Trade[]
  onSuccess: () => void
  onCancel: () => void
  initialTrade?: Trade
}

function makeDefault(): NewTradeInput {
  return {
    date_opened: new Date().toISOString().split('T')[0],
    ticker: '',
    strategy: 'cash_secured_put',
    strike_price: 0,
    contracts: 1,
    expiry_date: '',
    premium_in: 0,
    brokerage_fees: 0,
    notes: '',
    linked_trade_id: null,
    delta: null,
    iv: null,
    underlying_price_at_open: null,
  }
}

function tradeToForm(trade: Trade): NewTradeInput {
  return {
    date_opened: trade.date_opened,
    ticker: trade.ticker,
    strategy: trade.strategy,
    strike_price: trade.strike_price,
    contracts: trade.contracts,
    expiry_date: trade.expiry_date,
    premium_in: trade.premium_in,
    brokerage_fees: trade.brokerage_fees,
    notes: trade.notes ?? '',
    linked_trade_id: trade.linked_trade_id,
    delta: trade.delta,
    iv: trade.iv,
    underlying_price_at_open: trade.underlying_price_at_open,
  }
}

export function TradePanelForm({ openTrades, onSuccess, onCancel, initialTrade }: Props) {
  const isEdit = !!initialTrade
  const [form, setForm] = useState<NewTradeInput>(
    initialTrade ? tradeToForm(initialTrade) : makeDefault()
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof NewTradeInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (isEdit) {
        await updateTrade(initialTrade.id, {
          ...form,
          ticker: form.ticker.toUpperCase(),
          trade_type: form.strategy === 'cash_secured_put' ? 'put' : 'call',
        })
      } else {
        await insertTrade({
          ...form,
          ticker: form.ticker.toUpperCase(),
          trade_type: form.strategy === 'cash_secured_put' ? 'put' : 'call',
          opening_action: 'sell_to_open',
          closing_action: null,
          date_closed: null,
          status: 'open',
          assignment_status: null,
          shares: null,
          cost_basis: null,
          premium_out: 0,
          underlying_price_at_close: null,
        })
        setForm(makeDefault())
      }
      onSuccess()
    } catch (err: any) {
      setError(err?.message ?? err?.details ?? String(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="TICKER">
          <input
            required
            value={form.ticker}
            onChange={(e) => set('ticker', e.target.value.toUpperCase())}
            placeholder="AAPL"
            className={inputCls}
          />
        </Field>
        <Field label="CONTRACTS">
          <input
            required
            type="number"
            min={1}
            value={form.contracts}
            onChange={(e) => set('contracts', parseInt(e.target.value))}
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="STRATEGY">
        <select
          value={form.strategy}
          onChange={(e) => set('strategy', e.target.value as TradeStrategy)}
          className={inputCls}
        >
          <option value="cash_secured_put">Cash-Secured Put</option>
          <option value="covered_call">Covered Call</option>
        </select>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="STRIKE PRICE">
          <input
            required
            type="number"
            step="0.01"
            min={0}
            value={form.strike_price || ''}
            onChange={(e) => set('strike_price', parseFloat(e.target.value))}
            placeholder="170.00"
            className={inputCls}
          />
        </Field>
        <Field label="EXPIRY DATE">
          <input
            required
            type="date"
            value={form.expiry_date}
            onChange={(e) => set('expiry_date', e.target.value)}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="PREMIUM RECEIVED ($)">
          <input
            required
            type="number"
            step="0.01"
            min={0}
            value={form.premium_in || ''}
            onChange={(e) => set('premium_in', parseFloat(e.target.value))}
            placeholder="185.00"
            className={inputCls}
          />
        </Field>
        <Field label="FEES ($)">
          <input
            type="number"
            step="0.01"
            min={0}
            value={form.brokerage_fees || ''}
            onChange={(e) => set('brokerage_fees', parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className={inputCls}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="DELTA (OPTIONAL)">
          <input
            type="number"
            step="0.001"
            min={-1}
            max={1}
            value={form.delta ?? ''}
            onChange={(e) => set('delta', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="-0.30"
            className={inputCls}
          />
        </Field>
        <Field label="IV% (OPTIONAL)">
          <input
            type="number"
            step="0.1"
            min={0}
            max={999}
            value={form.iv ?? ''}
            onChange={(e) => set('iv', e.target.value ? parseFloat(e.target.value) : null)}
            placeholder="35.0"
            className={inputCls}
          />
        </Field>
      </div>

      <Field label="STOCK PRICE AT ENTRY (OPTIONAL)">
        <input
          type="number"
          step="0.01"
          min={0}
          value={form.underlying_price_at_open ?? ''}
          onChange={(e) => set('underlying_price_at_open', e.target.value ? parseFloat(e.target.value) : null)}
          placeholder="172.40"
          className={inputCls}
        />
      </Field>

      <Field label="DATE OPENED">
        <input
          required
          type="date"
          value={form.date_opened}
          onChange={(e) => set('date_opened', e.target.value)}
          className={inputCls}
        />
      </Field>

      {openTrades.length > 0 && (
        <Field label="LINK TO TRADE (WHEEL CHAIN)">
          <select
            value={form.linked_trade_id ?? ''}
            onChange={(e) => set('linked_trade_id', e.target.value || null)}
            className={inputCls}
          >
            <option value="">None</option>
            {openTrades.map((t) => (
              <option key={t.id} value={t.id}>
                {t.ticker} {t.strategy === 'cash_secured_put' ? 'CSP' : 'CC'} ${t.strike_price}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field label="NOTES (OPTIONAL)">
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </Field>

      {error && <p className="text-accent-red text-xs">{error}</p>}

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
          {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Log Trade'}
        </button>
      </div>
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
