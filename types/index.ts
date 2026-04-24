export type TradeStatus = 'open' | 'closed' | 'assigned'
export type TradeStrategy = 'cash_secured_put' | 'covered_call'
export type TradeType = 'put' | 'call'

export interface Trade {
  id: string
  created_at: string
  date_opened: string          // ISO date string e.g. "2026-04-01"
  date_closed: string | null
  ticker: string
  strategy: TradeStrategy
  trade_type: TradeType
  opening_action: string
  closing_action: string | null
  strike_price: number
  contracts: number
  expiry_date: string          // ISO date string
  premium_in: number
  premium_out: number
  brokerage_fees: number
  status: TradeStatus
  assignment_status: string | null
  shares: number | null
  cost_basis: number | null
  linked_trade_id: string | null
  notes: string | null
  delta: number | null
  iv: number | null
  underlying_price_at_open: number | null
  underlying_price_at_close: number | null
}

export interface NewTradeInput {
  date_opened: string
  ticker: string
  strategy: TradeStrategy
  strike_price: number
  contracts: number
  expiry_date: string
  premium_in: number
  brokerage_fees: number
  notes: string
  linked_trade_id: string | null
  delta: number | null
  iv: number | null
  underlying_price_at_open: number | null
}

export interface CloseTradeInput {
  id: string
  premium_out: number
  date_closed: string
  closing_action: string
  status: 'closed' | 'assigned'
  shares?: number
  cost_basis?: number
}

export type TradePanelMode = 'open' | 'close' | 'assign' | 'roll' | 'edit'

export interface PriceMap {
  [ticker: string]: number
}
