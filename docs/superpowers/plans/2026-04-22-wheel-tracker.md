# Wheel Options Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal desktop web app for tracking Wheel strategy options trades with live P&L via Finnhub WebSocket, deployed to Vercel + Supabase.

**Architecture:** Next.js 14 App Router with a fixed sidebar layout and four pages (Dashboard, Positions, History, Analytics). Trade data lives in Supabase Postgres. Live stock prices arrive via a Finnhub WebSocket connection opened on the Positions page and used to calculate unrealized P&L client-side.

**Tech Stack:** Next.js 14, TypeScript, Tailwind CSS, Supabase (`@supabase/supabase-js`), Finnhub WebSocket, Recharts, Jest + React Testing Library

---

## File Map

```
app/
  layout.tsx                          # Root layout — sidebar + main content wrapper
  page.tsx                            # Redirects to /dashboard
  globals.css                         # Global styles, Tailwind base
  dashboard/page.tsx                  # Dashboard page (server component, passes data to client components)
  positions/page.tsx                  # Positions page (client component — holds WebSocket state)
  history/page.tsx                    # History page (server component)
  analytics/page.tsx                  # Analytics page (server component)

components/
  sidebar/Sidebar.tsx                 # Fixed left nav with "+ New Trade" button
  ui/
    StrategyBadge.tsx                 # CSP (purple) / CC (green) pill
    PnlBadge.tsx                      # +$X (green) / -$X (red) formatted value
    DteBadge.tsx                      # "14 DTE" coloured by urgency
    DteBar.tsx                        # Progress bar that fills as expiry approaches
  dashboard/
    StatsRow.tsx                      # Four stat cards row
    PositionsPreview.tsx              # Compact 5-row open positions table
    PnlChart.tsx                      # Cumulative realized P&L line chart
  positions/
    PositionsTable.tsx                # Full open positions table wrapper
    PositionRow.tsx                   # Single row: ticker, badge, strike, live price, P&L, DTE, actions
  history/
    HistoryTable.tsx                  # Closed trades table with filter bar
  analytics/
    CumulativePnlChart.tsx
    MonthlyPnlChart.tsx
    WinRateDonut.tsx
    TickerBreakdownTable.tsx
  trade-panel/
    TradePanel.tsx                    # Slide-in right panel, handles open/close/assign/roll modes
    TradePanelForm.tsx                # Form fields inside the panel

hooks/
  useTrades.ts                        # Fetches all trades from Supabase, splits open/closed
  useFinnhubPrices.ts                 # Opens Finnhub WebSocket, returns live { [ticker]: price } map

lib/
  supabase.ts                         # Supabase JS client singleton
  calculations.ts                     # All P&L, DTE, ROC formulas (pure functions)
  finnhub.ts                          # FinnhubSocket class — manages WS lifecycle

types/index.ts                        # Trade, TradeStatus, TradeStrategy, TradeType interfaces

__tests__/
  lib/calculations.test.ts
  hooks/useFinnhubPrices.test.ts
```

---

## Task 1: Bootstrap Project

**Files:**
- Create: `package.json`, `next.config.ts`, `tailwind.config.ts`, `tsconfig.json`, `.env.local`

- [ ] **Step 1: Scaffold Next.js app**

Run inside `/Users/braydnhoewel/projects/options-tracker`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --yes
```

Expected: Next.js project files created (package.json, app/, etc.)

- [ ] **Step 2: Install runtime dependencies**

```bash
npm install @supabase/supabase-js recharts
```

- [ ] **Step 3: Install test dependencies**

```bash
npm install --save-dev jest jest-environment-jsdom @types/jest @testing-library/react @testing-library/jest-dom ts-jest
```

- [ ] **Step 4: Create Jest config**

Create `jest.config.ts`:
```typescript
import type { Config } from 'jest'

const config: Config = {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
}

export default config
```

Create `jest.setup.ts`:
```typescript
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Update tailwind.config.ts with design tokens**

Replace the content of `tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0F0F0F',
          panel: '#1A1A1A',
          hover: '#222222',
        },
        border: {
          DEFAULT: '#2A2A2A',
          subtle: '#1F1F1F',
        },
        text: {
          primary: '#FFFFFF',
          muted: '#555555',
          dim: '#333333',
        },
        accent: {
          green: '#22C55E',
          red: '#F87171',
          purple: '#A78BFA',
          amber: '#F59E0B',
        },
      },
    },
  },
  plugins: [],
}

export default config
```

- [ ] **Step 6: Create .env.local**

```bash
cat > .env.local << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_FINNHUB_API_KEY=your_finnhub_api_key
EOF
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Server running at http://localhost:3000 with default Next.js page.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: bootstrap Next.js project with Tailwind and test setup"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `types/index.ts`

- [ ] **Step 1: Create types**

Create `types/index.ts`:
```typescript
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

export type TradePanelMode = 'open' | 'close' | 'assign' | 'roll'

export interface PriceMap {
  [ticker: string]: number
}
```

- [ ] **Step 2: Commit**

```bash
git add types/index.ts
git commit -m "feat: add Trade type definitions"
```

---

## Task 3: Calculations Library (TDD)

**Files:**
- Create: `__tests__/lib/calculations.test.ts`
- Create: `lib/calculations.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/calculations.test.ts`:
```typescript
import {
  calcNetPremium,
  calcDte,
  calcCapitalSecured,
  calcUnrealizedPnl,
  calcReturnOnCapital,
  calcAnnualizedReturn,
  dteColor,
  dteFillPercent,
  calcCumulativePnl,
  groupByMonth,
} from '@/lib/calculations'
import type { Trade } from '@/types'

describe('calcNetPremium', () => {
  it('subtracts premium_out and fees from premium_in', () => {
    expect(calcNetPremium(185, 40, 1)).toBe(144)
  })
  it('returns premium_in when no buyback or fees', () => {
    expect(calcNetPremium(200, 0, 0)).toBe(200)
  })
})

describe('calcDte', () => {
  it('returns 0 for today', () => {
    const today = new Date().toISOString().split('T')[0]
    expect(calcDte(today)).toBe(0)
  })
  it('returns positive for future date', () => {
    const future = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
    expect(calcDte(future)).toBe(14)
  })
  it('returns negative for expired option', () => {
    const past = new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]
    expect(calcDte(past)).toBe(-2)
  })
})

describe('calcCapitalSecured', () => {
  it('multiplies strike × contracts × 100', () => {
    expect(calcCapitalSecured(170, 1)).toBe(17000)
    expect(calcCapitalSecured(50, 3)).toBe(15000)
  })
})

describe('calcUnrealizedPnl', () => {
  it('CSP: full profit when stock is above strike', () => {
    // Stock at 175, sold CSP at strike 170, received $185 premium, 1 contract
    // Intrinsic = max(170 - 175, 0) = 0 → P&L = 185 - 0 = 185
    expect(calcUnrealizedPnl('cash_secured_put', 185, 170, 1, 175)).toBe(185)
  })
  it('CSP: partial loss when stock is below strike', () => {
    // Stock at 160, sold CSP at strike 170, received $185 premium, 1 contract
    // Intrinsic = max(170 - 160, 0) = 10 → loss = 10 × 100 = 1000 → P&L = 185 - 1000 = -815
    expect(calcUnrealizedPnl('cash_secured_put', 185, 170, 1, 160)).toBe(-815)
  })
  it('CC: full profit when stock is below strike', () => {
    // Stock at 240, sold CC at strike 250, received $320 premium, 1 contract
    // Intrinsic = max(240 - 250, 0) = 0 → P&L = 320
    expect(calcUnrealizedPnl('covered_call', 320, 250, 1, 240)).toBe(320)
  })
  it('CC: loss when stock is above strike', () => {
    // Stock at 270, sold CC at strike 250, received $320 premium, 1 contract
    // Intrinsic = max(270 - 250, 0) = 20 → loss = 2000 → P&L = 320 - 2000 = -1680
    expect(calcUnrealizedPnl('covered_call', 320, 250, 1, 270)).toBe(-1680)
  })
  it('handles multiple contracts', () => {
    // Stock at 160, sold 2x CSP at strike 170, received $370 premium
    // Intrinsic per share = 10, loss = 10 × 100 × 2 = 2000 → P&L = 370 - 2000 = -1630
    expect(calcUnrealizedPnl('cash_secured_put', 370, 170, 2, 160)).toBe(-1630)
  })
})

describe('calcReturnOnCapital', () => {
  it('divides net premium by capital secured', () => {
    expect(calcReturnOnCapital(185, 17000)).toBeCloseTo(0.01088, 4)
  })
  it('returns 0 for zero capital', () => {
    expect(calcReturnOnCapital(100, 0)).toBe(0)
  })
})

describe('calcAnnualizedReturn', () => {
  it('scales ROC by 365 / days held', () => {
    expect(calcAnnualizedReturn(0.01, 30)).toBeCloseTo(0.1217, 3)
  })
  it('returns 0 for zero days held', () => {
    expect(calcAnnualizedReturn(0.01, 0)).toBe(0)
  })
})

describe('dteColor', () => {
  it('returns red for ≤7 DTE', () => {
    expect(dteColor(7)).toBe('#F87171')
    expect(dteColor(0)).toBe('#F87171')
    expect(dteColor(-1)).toBe('#F87171')
  })
  it('returns amber for 8–21 DTE', () => {
    expect(dteColor(8)).toBe('#F59E0B')
    expect(dteColor(21)).toBe('#F59E0B')
  })
  it('returns green for >21 DTE', () => {
    expect(dteColor(22)).toBe('#22C55E')
  })
})

describe('dteFillPercent', () => {
  it('returns 0 when opened today and expiry is in the future', () => {
    const today = new Date().toISOString().split('T')[0]
    const future = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
    expect(dteFillPercent(today, future)).toBeCloseTo(0, 0)
  })
  it('returns 100 when past expiry', () => {
    const past30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
    const past1 = new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]
    expect(dteFillPercent(past30, past1)).toBe(100)
  })
})

describe('calcCumulativePnl', () => {
  it('returns running sum of net premiums sorted by date_closed', () => {
    const trades = [
      { date_closed: '2026-02-01', premium_in: 200, premium_out: 0, brokerage_fees: 1 },
      { date_closed: '2026-01-15', premium_in: 100, premium_out: 0, brokerage_fees: 1 },
    ] as Partial<Trade>[] as Trade[]
    const result = calcCumulativePnl(trades)
    expect(result).toEqual([
      { date: '2026-01-15', cumPnl: 99 },
      { date: '2026-02-01', cumPnl: 298 },
    ])
  })
})

describe('groupByMonth', () => {
  it('sums net premium by month label', () => {
    const trades = [
      { date_closed: '2026-01-10', premium_in: 100, premium_out: 0, brokerage_fees: 0 },
      { date_closed: '2026-01-20', premium_in: 50, premium_out: 0, brokerage_fees: 0 },
      { date_closed: '2026-02-05', premium_in: 200, premium_out: 0, brokerage_fees: 0 },
    ] as Partial<Trade>[] as Trade[]
    const result = groupByMonth(trades)
    expect(result).toEqual([
      { month: 'Jan 2026', pnl: 150 },
      { month: 'Feb 2026', pnl: 200 },
    ])
  })
})
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
npx jest __tests__/lib/calculations.test.ts --no-coverage
```

Expected: All tests FAIL with "Cannot find module '@/lib/calculations'"

- [ ] **Step 3: Implement calculations.ts**

Create `lib/calculations.ts`:
```typescript
import type { Trade, TradeStrategy } from '@/types'

export function calcNetPremium(
  premiumIn: number,
  premiumOut: number,
  fees: number
): number {
  return premiumIn - premiumOut - fees
}

export function calcDte(expiryDate: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  return Math.round((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function calcCapitalSecured(strikePrice: number, contracts: number): number {
  return strikePrice * contracts * 100
}

export function calcUnrealizedPnl(
  strategy: TradeStrategy,
  premiumIn: number,
  strikePrice: number,
  contracts: number,
  stockPrice: number
): number {
  const intrinsic =
    strategy === 'cash_secured_put'
      ? Math.max(strikePrice - stockPrice, 0)
      : Math.max(stockPrice - strikePrice, 0)
  return premiumIn - intrinsic * contracts * 100
}

export function calcReturnOnCapital(netPremium: number, capitalSecured: number): number {
  if (capitalSecured === 0) return 0
  return netPremium / capitalSecured
}

export function calcAnnualizedReturn(rocDecimal: number, daysHeld: number): number {
  if (daysHeld === 0) return 0
  return rocDecimal * (365 / daysHeld)
}

export function dteColor(dte: number): string {
  if (dte <= 7) return '#F87171'
  if (dte <= 21) return '#F59E0B'
  return '#22C55E'
}

export function dteFillPercent(dateOpened: string, expiryDate: string): number {
  const opened = new Date(dateOpened).getTime()
  const expiry = new Date(expiryDate).getTime()
  const now = Date.now()
  const total = expiry - opened
  if (total <= 0) return 100
  return Math.min(100, Math.max(0, ((now - opened) / total) * 100))
}

export function calcCumulativePnl(
  closedTrades: Trade[]
): { date: string; cumPnl: number }[] {
  const sorted = [...closedTrades]
    .filter((t) => t.date_closed)
    .sort((a, b) => a.date_closed!.localeCompare(b.date_closed!))

  let running = 0
  return sorted.map((t) => {
    running += calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
    return { date: t.date_closed!, cumPnl: Math.round(running * 100) / 100 }
  })
}

export function groupByMonth(
  closedTrades: Trade[]
): { month: string; pnl: number }[] {
  const map = new Map<string, number>()

  const sorted = [...closedTrades]
    .filter((t) => t.date_closed)
    .sort((a, b) => a.date_closed!.localeCompare(b.date_closed!))

  for (const t of sorted) {
    const d = new Date(t.date_closed!)
    const label = d.toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })
    const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
    map.set(label, (map.get(label) ?? 0) + net)
  }

  return Array.from(map.entries()).map(([month, pnl]) => ({ month, pnl }))
}
```

- [ ] **Step 4: Run tests — all should pass**

```bash
npx jest __tests__/lib/calculations.test.ts --no-coverage
```

Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add lib/calculations.ts __tests__/lib/calculations.test.ts
git commit -m "feat: add calculations library with full test coverage"
```

---

## Task 4: Supabase Client + Database Migration

**Files:**
- Create: `lib/supabase.ts`

- [ ] **Step 1: Create Supabase project**

Go to https://supabase.com → New project. Copy the Project URL and anon key into `.env.local`.

- [ ] **Step 2: Run migration in Supabase SQL Editor**

In Supabase dashboard → SQL Editor → New query, paste and run:

```sql
create table trades (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz default now(),
  date_opened     date not null,
  date_closed     date,
  ticker          text not null,
  strategy        text not null check (strategy in ('cash_secured_put', 'covered_call')),
  trade_type      text not null check (trade_type in ('put', 'call')),
  opening_action  text not null default 'sell_to_open',
  closing_action  text,
  strike_price    numeric(10,2) not null,
  contracts       integer not null default 1,
  expiry_date     date not null,
  premium_in      numeric(10,2) not null default 0,
  premium_out     numeric(10,2) not null default 0,
  brokerage_fees  numeric(10,2) not null default 0,
  status          text not null default 'open' check (status in ('open', 'closed', 'assigned')),
  assignment_status text,
  shares          integer,
  cost_basis      numeric(10,2),
  linked_trade_id uuid references trades(id),
  notes           text
);

-- Index for common query patterns
create index trades_status_idx on trades(status);
create index trades_ticker_idx on trades(ticker);
create index trades_expiry_idx on trades(expiry_date);
```

Expected: "Success. No rows returned."

- [ ] **Step 3: Create Supabase client**

Create `lib/supabase.ts`:
```typescript
import { createClient } from '@supabase/supabase-js'
import type { Trade } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Trade[]
}

export async function insertTrade(input: Omit<Trade, 'id' | 'created_at'>): Promise<Trade> {
  const { data, error } = await supabase
    .from('trades')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function updateTrade(id: string, updates: Partial<Trade>): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}
```

- [ ] **Step 4: Commit**

```bash
git add lib/supabase.ts
git commit -m "feat: add Supabase client and trade CRUD helpers"
```

---

## Task 5: Finnhub WebSocket Manager

**Files:**
- Create: `lib/finnhub.ts`

- [ ] **Step 1: Create FinnhubSocket class**

Create `lib/finnhub.ts`:
```typescript
type PriceHandler = (ticker: string, price: number) => void

export class FinnhubSocket {
  private ws: WebSocket | null = null
  private subscriptions = new Set<string>()
  private onPrice: PriceHandler
  private apiKey: string
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(apiKey: string, onPrice: PriceHandler) {
    this.apiKey = apiKey
    this.onPrice = onPrice
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(`wss://ws.finnhub.io?token=${this.apiKey}`)

    this.ws.onopen = () => {
      // Re-subscribe all tickers after reconnect
      for (const ticker of this.subscriptions) {
        this.send({ type: 'subscribe', symbol: ticker })
      }
    }

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data as string)
      if (msg.type === 'trade' && Array.isArray(msg.data)) {
        for (const trade of msg.data) {
          this.onPrice(trade.s, trade.p)
        }
      }
    }

    this.ws.onclose = () => {
      // Auto-reconnect after 3s if we still have subscriptions
      if (this.subscriptions.size > 0) {
        this.reconnectTimer = setTimeout(() => this.connect(), 3000)
      }
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  subscribe(ticker: string): void {
    this.subscriptions.add(ticker)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', symbol: ticker })
    } else {
      this.connect()
    }
  }

  unsubscribe(ticker: string): void {
    this.subscriptions.delete(ticker)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', symbol: ticker })
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.subscriptions.clear()
    this.ws?.close()
    this.ws = null
  }

  private send(msg: object): void {
    this.ws?.send(JSON.stringify(msg))
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/finnhub.ts
git commit -m "feat: add Finnhub WebSocket manager with auto-reconnect"
```

---

## Task 6: UI Primitives

**Files:**
- Create: `components/ui/StrategyBadge.tsx`
- Create: `components/ui/PnlBadge.tsx`
- Create: `components/ui/DteBadge.tsx`
- Create: `components/ui/DteBar.tsx`

- [ ] **Step 1: Create StrategyBadge**

Create `components/ui/StrategyBadge.tsx`:
```typescript
import type { TradeStrategy } from '@/types'

interface Props {
  strategy: TradeStrategy
}

export function StrategyBadge({ strategy }: Props) {
  const isCSP = strategy === 'cash_secured_put'
  return (
    <span
      className={`
        inline-block px-2 py-0.5 rounded text-xs font-medium
        ${isCSP
          ? 'bg-accent-purple/10 text-accent-purple'
          : 'bg-accent-green/10 text-accent-green'
        }
      `}
    >
      {isCSP ? 'CSP' : 'CC'}
    </span>
  )
}
```

- [ ] **Step 2: Create PnlBadge**

Create `components/ui/PnlBadge.tsx`:
```typescript
interface Props {
  value: number
  className?: string
}

export function PnlBadge({ value, className = '' }: Props) {
  const isPositive = value >= 0
  const formatted = `${isPositive ? '+' : ''}$${Math.abs(value).toLocaleString('en-AU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`

  return (
    <span
      className={`font-medium tabular-nums ${
        isPositive ? 'text-accent-green' : 'text-accent-red'
      } ${className}`}
    >
      {formatted}
    </span>
  )
}
```

- [ ] **Step 3: Create DteBadge**

Create `components/ui/DteBadge.tsx`:
```typescript
import { calcDte, dteColor } from '@/lib/calculations'

interface Props {
  expiryDate: string
}

export function DteBadge({ expiryDate }: Props) {
  const dte = calcDte(expiryDate)
  const color = dteColor(dte)

  return (
    <span className="tabular-nums text-sm font-medium" style={{ color }}>
      {dte < 0 ? 'Expired' : `${dte}d`}
    </span>
  )
}
```

- [ ] **Step 4: Create DteBar**

Create `components/ui/DteBar.tsx`:
```typescript
import { calcDte, dteColor, dteFillPercent } from '@/lib/calculations'

interface Props {
  dateOpened: string
  expiryDate: string
}

export function DteBar({ dateOpened, expiryDate }: Props) {
  const dte = calcDte(expiryDate)
  const fill = dteFillPercent(dateOpened, expiryDate)
  const color = dteColor(dte)

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 bg-border rounded-full h-1">
        <div
          className="h-1 rounded-full transition-all duration-300"
          style={{ width: `${fill}%`, backgroundColor: color }}
        />
      </div>
      <DteBadge expiryDate={expiryDate} />
    </div>
  )
}

// Re-export DteBadge so consumers can import both from this file if needed
import { DteBadge } from './DteBadge'
```

- [ ] **Step 5: Commit**

```bash
git add components/ui/
git commit -m "feat: add UI primitive components (badges, DTE bar)"
```

---

## Task 7: Root Layout + Sidebar

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `components/sidebar/Sidebar.tsx`

- [ ] **Step 1: Update globals.css**

Replace `app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  background-color: #0F0F0F;
  color: #FFFFFF;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: #1A1A1A;
}
::-webkit-scrollbar-thumb {
  background: #2A2A2A;
  border-radius: 2px;
}
```

- [ ] **Step 2: Create Sidebar component**

Create `components/sidebar/Sidebar.tsx`:
```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface SidebarProps {
  onAddTrade: () => void
}

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '▤' },
  { href: '/positions', label: 'Positions', icon: '◈' },
  { href: '/history', label: 'History', icon: '◷' },
  { href: '/analytics', label: 'Analytics', icon: '◉' },
]

export function Sidebar({ onAddTrade }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="w-52 h-screen bg-bg-panel border-r border-border flex flex-col fixed left-0 top-0 z-10">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-border">
        <span className="text-white font-semibold text-sm tracking-wide">⬡ WheelTracker</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                ${active
                  ? 'bg-bg-hover text-white'
                  : 'text-text-muted hover:text-white hover:bg-bg-hover'
                }
              `}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Add Trade button */}
      <div className="px-3 pb-5">
        <button
          onClick={onAddTrade}
          className="w-full bg-accent-purple/90 hover:bg-accent-purple text-white text-sm font-medium py-2 rounded-md transition-colors"
        >
          + New Trade
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 3: Update root layout**

Replace `app/layout.tsx`:
```typescript
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'WheelTracker',
  description: 'Options wheel strategy tracker',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-bg-base text-text-primary">
        {children}
      </body>
    </html>
  )
}
```

Note: The Sidebar lives in each page's layout so the `onAddTrade` callback can wire to the TradePanel state. The root layout is intentionally minimal.

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx components/sidebar/
git commit -m "feat: add root layout, global styles, and sidebar nav"
```

---

## Task 8: useTrades Hook

**Files:**
- Create: `hooks/useTrades.ts`

- [ ] **Step 1: Create hook**

Create `hooks/useTrades.ts`:
```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchTrades } from '@/lib/supabase'
import type { Trade } from '@/types'

interface UseTradesResult {
  trades: Trade[]
  openTrades: Trade[]
  closedTrades: Trade[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTrades(): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrades()
      setTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status !== 'open')

  return { trades, openTrades, closedTrades, loading, error, refresh }
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useTrades.ts
git commit -m "feat: add useTrades hook for Supabase data fetching"
```

---

## Task 9: useFinnhubPrices Hook

**Files:**
- Create: `hooks/useFinnhubPrices.ts`

- [ ] **Step 1: Create hook**

Create `hooks/useFinnhubPrices.ts`:
```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { FinnhubSocket } from '@/lib/finnhub'
import type { PriceMap } from '@/types'

export function useFinnhubPrices(tickers: string[]): PriceMap {
  const [prices, setPrices] = useState<PriceMap>({})
  const socketRef = useRef<FinnhubSocket | null>(null)
  const tickersKey = tickers.sort().join(',')

  useEffect(() => {
    if (tickers.length === 0) return

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY!
    const socket = new FinnhubSocket(apiKey, (ticker, price) => {
      setPrices((prev) => ({ ...prev, [ticker]: price }))
    })
    socketRef.current = socket

    for (const ticker of tickers) {
      socket.subscribe(ticker)
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey])

  return prices
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useFinnhubPrices.ts
git commit -m "feat: add useFinnhubPrices hook for live stock price WebSocket"
```

---

## Task 10: Trade Panel — New Trade

**Files:**
- Create: `components/trade-panel/TradePanelForm.tsx`
- Create: `components/trade-panel/TradePanel.tsx`

- [ ] **Step 1: Create TradePanelForm**

Create `components/trade-panel/TradePanelForm.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { insertTrade } from '@/lib/supabase'
import type { Trade, NewTradeInput, TradeStrategy } from '@/types'

interface Props {
  openTrades: Trade[]
  onSuccess: () => void
  onCancel: () => void
}

const defaultForm: NewTradeInput = {
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
}

export function TradePanelForm({ openTrades, onSuccess, onCancel }: Props) {
  const [form, setForm] = useState<NewTradeInput>(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (field: keyof NewTradeInput, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
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
      })
      setForm(defaultForm)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trade')
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
          {submitting ? 'Saving...' : 'Log Trade'}
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
```

- [ ] **Step 2: Create TradePanel (open mode)**

Create `components/trade-panel/TradePanel.tsx`:
```typescript
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
```

- [ ] **Step 3: Commit (partial — CloseAssignForm added next task)**

```bash
git add components/trade-panel/
git commit -m "feat: add TradePanel and TradePanelForm for opening trades"
```

---

## Task 11: Trade Panel — Close / Assign / Roll

**Files:**
- Modify: `components/trade-panel/TradePanel.tsx`

- [ ] **Step 1: Create CloseAssignForm and add to TradePanel.tsx**

Add the following to the bottom of `components/trade-panel/TradePanel.tsx` (before the final closing brace of the file):

```typescript
import { useState } from 'react'
import { updateTrade, insertTrade } from '@/lib/supabase'

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

  // Roll mode — new trade form pre-linked
  const [rollTicker, setRollTicker] = useState(trade.ticker)
  const [rollStrategy, setRollStrategy] = useState<import('@/types').TradeStrategy>(
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
      // Close the old trade at 0 buyback (rolling means new trade replaces it)
      await updateTrade(trade.id, {
        status: 'closed',
        premium_out: parseFloat(premiumOut) || 0,
        date_closed: dateClosed,
        closing_action: 'buy_to_close',
      })
      // Open the new rolled trade linked to original
      await insertTrade({
        date_opened: dateClosed,
        ticker: rollTicker.toUpperCase(),
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

  const inputCls =
    'w-full bg-bg-base border border-border rounded-md px-3 py-2 text-sm text-white placeholder-text-dim focus:outline-none focus:border-accent-purple/60 transition-colors'

  const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <div>
      <label className="block text-[10px] tracking-widest text-text-muted mb-1.5 uppercase">
        {label}
      </label>
      {children}
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

  // Summary of trade being acted on
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
          onChange={(e) => setRollStrategy(e.target.value as import('@/types').TradeStrategy)}
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
```

- [ ] **Step 2: Commit**

```bash
git add components/trade-panel/TradePanel.tsx
git commit -m "feat: add close/assign/roll modes to TradePanel"
```

---

## Task 12: Positions Page

**Files:**
- Create: `components/positions/PositionRow.tsx`
- Create: `components/positions/PositionsTable.tsx`
- Create: `app/positions/page.tsx`

- [ ] **Step 1: Create PositionRow**

Create `components/positions/PositionRow.tsx`:
```typescript
'use client'

import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { PnlBadge } from '@/components/ui/PnlBadge'
import { DteBar } from '@/components/ui/DteBar'
import { calcUnrealizedPnl } from '@/lib/calculations'
import type { Trade, TradePanelMode } from '@/types'

interface Props {
  trade: Trade
  livePrice: number | undefined
  onAction: (trade: Trade, mode: TradePanelMode) => void
}

export function PositionRow({ trade, livePrice, onAction }: Props) {
  const unrealizedPnl =
    livePrice !== undefined
      ? calcUnrealizedPnl(
          trade.strategy,
          trade.premium_in,
          trade.strike_price,
          trade.contracts,
          livePrice
        )
      : null

  return (
    <tr className="border-b border-border hover:bg-bg-hover transition-colors group">
      <td className="py-3 px-4">
        <span className="font-semibold text-white">{trade.ticker}</span>
      </td>
      <td className="py-3 px-4">
        <StrategyBadge strategy={trade.strategy} />
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        ${trade.strike_price.toFixed(2)}
      </td>
      <td className="py-3 px-4 text-sm tabular-nums">
        {livePrice !== undefined ? (
          <span className="text-white">${livePrice.toFixed(2)}</span>
        ) : (
          <span className="text-text-muted animate-pulse">···</span>
        )}
      </td>
      <td className="py-3 px-4">
        <PnlBadge value={trade.premium_in} />
      </td>
      <td className="py-3 px-4">
        {unrealizedPnl !== null ? (
          <PnlBadge value={Math.round(unrealizedPnl)} />
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>
      <td className="py-3 px-4">
        <DteBar dateOpened={trade.date_opened} expiryDate={trade.expiry_date} />
      </td>
      <td className="py-3 px-4">
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <ActionButton onClick={() => onAction(trade, 'close')} label="Close" />
          <ActionButton onClick={() => onAction(trade, 'assign')} label="Assign" />
          <ActionButton onClick={() => onAction(trade, 'roll')} label="Roll" />
        </div>
      </td>
    </tr>
  )
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2 py-1 text-xs text-text-muted border border-border rounded hover:text-white hover:border-accent-purple/50 transition-colors"
    >
      {label}
    </button>
  )
}
```

- [ ] **Step 2: Create PositionsTable**

Create `components/positions/PositionsTable.tsx`:
```typescript
'use client'

import { PositionRow } from './PositionRow'
import type { Trade, TradePanelMode, PriceMap } from '@/types'

interface Props {
  trades: Trade[]
  prices: PriceMap
  onAction: (trade: Trade, mode: TradePanelMode) => void
}

const HEADERS = ['Ticker', 'Type', 'Strike', 'Live Price', 'Premium In', 'Unreal. P&L', 'DTE', 'Actions']

export function PositionsTable({ trades, prices, onAction }: Props) {
  if (trades.length === 0) {
    return (
      <div className="text-center py-16 text-text-muted text-sm">
        No open positions. Click <span className="text-accent-purple">+ New Trade</span> to get started.
      </div>
    )
  }

  const sorted = [...trades].sort((a, b) => {
    const dteA = new Date(a.expiry_date).getTime()
    const dteB = new Date(b.expiry_date).getTime()
    return dteA - dteB
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border">
            {HEADERS.map((h) => (
              <th
                key={h}
                className="py-2 px-4 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map((trade) => (
            <PositionRow
              key={trade.id}
              trade={trade}
              livePrice={prices[trade.ticker]}
              onAction={onAction}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 3: Create positions page**

Create `app/positions/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { PositionsTable } from '@/components/positions/PositionsTable'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'
import { useFinnhubPrices } from '@/hooks/useFinnhubPrices'
import type { Trade, TradePanelMode } from '@/types'

export default function PositionsPage() {
  const { openTrades, trades, loading, refresh } = useTrades()
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
```

- [ ] **Step 4: Verify the Positions page works**

```bash
npm run dev
```

Navigate to http://localhost:3000/positions. Verify:
- Sidebar renders with nav links
- "No open positions" message shows when empty
- "+ New Trade" opens the slide-in panel
- Form fields are present and submittable

- [ ] **Step 5: Commit**

```bash
git add components/positions/ app/positions/
git commit -m "feat: add Positions page with live prices and trade actions"
```

---

## Task 13: Dashboard Page

**Files:**
- Create: `components/dashboard/StatsRow.tsx`
- Create: `components/dashboard/PositionsPreview.tsx`
- Create: `components/dashboard/PnlChart.tsx`
- Create: `app/dashboard/page.tsx`

- [ ] **Step 1: Create StatsRow**

Create `components/dashboard/StatsRow.tsx`:
```typescript
import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium } from '@/lib/calculations'
import type { Trade } from '@/types'

interface Props {
  trades: Trade[]
  openTrades: Trade[]
}

export function StatsRow({ trades, openTrades }: Props) {
  const closedTrades = trades.filter((t) => t.status !== 'open')

  const totalPnl = closedTrades.reduce(
    (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
    0
  )

  const winCount = closedTrades.filter(
    (t) => calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees) > 0
  ).length
  const winRate = closedTrades.length > 0 ? (winCount / closedTrades.length) * 100 : 0

  const thisMonth = (() => {
    const now = new Date()
    return closedTrades
      .filter((t) => {
        if (!t.date_closed) return false
        const d = new Date(t.date_closed)
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
      })
      .reduce((sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees), 0)
  })()

  const stats = [
    { label: 'TOTAL P&L', value: <PnlBadge value={Math.round(totalPnl)} className="text-xl" /> },
    { label: 'OPEN POSITIONS', value: <span className="text-white text-xl font-semibold">{openTrades.length}</span> },
    {
      label: 'WIN RATE',
      value: (
        <span className="text-accent-purple text-xl font-semibold">
          {closedTrades.length > 0 ? `${Math.round(winRate)}%` : '—'}
        </span>
      ),
    },
    { label: 'THIS MONTH', value: <PnlBadge value={Math.round(thisMonth)} className="text-xl" /> },
  ]

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      {stats.map(({ label, value }) => (
        <div key={label} className="bg-bg-panel border border-border rounded-lg p-4">
          <p className="text-[10px] tracking-widest text-text-muted uppercase mb-2">{label}</p>
          {value}
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 2: Create PositionsPreview**

Create `components/dashboard/PositionsPreview.tsx`:
```typescript
import Link from 'next/link'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { DteBadge } from '@/components/ui/DteBadge'
import type { Trade } from '@/types'

interface Props {
  openTrades: Trade[]
}

export function PositionsPreview({ openTrades }: Props) {
  const sorted = [...openTrades]
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime())
    .slice(0, 5)

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden mb-6">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border">
        <h2 className="text-sm font-medium text-white">Open Positions</h2>
        <Link href="/positions" className="text-xs text-accent-purple hover:underline">
          View all →
        </Link>
      </div>
      {sorted.length === 0 ? (
        <p className="text-text-muted text-sm px-5 py-6">No open positions.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Type', 'Strike', 'Premium', 'DTE'].map((h) => (
                <th key={h} className="py-2 px-5 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((t) => (
              <tr key={t.id} className="border-b border-border last:border-0">
                <td className="py-2.5 px-5 text-sm font-semibold text-white">{t.ticker}</td>
                <td className="py-2.5 px-5"><StrategyBadge strategy={t.strategy} /></td>
                <td className="py-2.5 px-5 text-sm tabular-nums">${t.strike_price.toFixed(2)}</td>
                <td className="py-2.5 px-5 text-sm tabular-nums text-accent-green">+${t.premium_in.toFixed(0)}</td>
                <td className="py-2.5 px-5"><DteBadge expiryDate={t.expiry_date} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create PnlChart**

Create `components/dashboard/PnlChart.tsx`:
```typescript
'use client'

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { calcCumulativePnl } from '@/lib/calculations'
import type { Trade } from '@/types'

interface Props {
  closedTrades: Trade[]
}

export function PnlChart({ closedTrades }: Props) {
  const data = calcCumulativePnl(closedTrades)

  if (data.length === 0) {
    return (
      <div className="bg-bg-panel border border-border rounded-lg p-5">
        <h2 className="text-sm font-medium text-white mb-4">Cumulative P&L</h2>
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">
          No closed trades yet.
        </div>
      </div>
    )
  }

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-5">
      <h2 className="text-sm font-medium text-white mb-4">Cumulative P&L</h2>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })
            }}
          />
          <YAxis
            tick={{ fill: '#555555', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v: number) => `$${v}`}
            width={50}
          />
          <Tooltip
            contentStyle={{
              background: '#1A1A1A',
              border: '1px solid #2A2A2A',
              borderRadius: '6px',
              color: '#fff',
              fontSize: 12,
            }}
            formatter={(v: number) => [`$${v.toFixed(0)}`, 'Cumulative P&L']}
            labelStyle={{ color: '#555555' }}
          />
          <Line
            type="monotone"
            dataKey="cumPnl"
            stroke="#22C55E"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#22C55E' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: Create dashboard page**

Create `app/dashboard/page.tsx`:
```typescript
'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { StatsRow } from '@/components/dashboard/StatsRow'
import { PositionsPreview } from '@/components/dashboard/PositionsPreview'
import { PnlChart } from '@/components/dashboard/PnlChart'
import { TradePanel } from '@/components/trade-panel/TradePanel'
import { useTrades } from '@/hooks/useTrades'

export default function DashboardPage() {
  const { trades, openTrades, closedTrades, loading, refresh } = useTrades()
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
            <PositionsPreview openTrades={openTrades} />
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
```

- [ ] **Step 5: Verify dashboard loads**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard. Verify stat cards render, positions preview shows, chart container appears.

- [ ] **Step 6: Commit**

```bash
git add components/dashboard/ app/dashboard/
git commit -m "feat: add Dashboard page with stats, positions preview, and P&L chart"
```

---

## Task 14: History Page

**Files:**
- Create: `components/history/HistoryTable.tsx`
- Create: `app/history/page.tsx`

- [ ] **Step 1: Create HistoryTable**

Create `components/history/HistoryTable.tsx`:
```typescript
'use client'

import { useState, useMemo } from 'react'
import { StrategyBadge } from '@/components/ui/StrategyBadge'
import { PnlBadge } from '@/components/ui/PnlBadge'
import { calcNetPremium, calcReturnOnCapital, calcCapitalSecured } from '@/lib/calculations'
import type { Trade } from '@/types'

interface Props {
  trades: Trade[]
}

const OUTCOME_LABELS: Record<string, string> = {
  closed: 'Closed',
  assigned: 'Assigned',
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
                  className={`border-b border-border last:border-0 hover:bg-bg-hover transition-colors ${isLinked ? 'pl-8' : ''}`}
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
                      {OUTCOME_LABELS[t.status] ?? t.status}
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
```

- [ ] **Step 2: Create history page**

Create `app/history/page.tsx`:
```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add components/history/ app/history/
git commit -m "feat: add History page with filterable closed trades table"
```

---

## Task 15: Analytics Page

**Files:**
- Create: `components/analytics/CumulativePnlChart.tsx`
- Create: `components/analytics/MonthlyPnlChart.tsx`
- Create: `components/analytics/WinRateDonut.tsx`
- Create: `components/analytics/TickerBreakdownTable.tsx`
- Create: `app/analytics/page.tsx`

- [ ] **Step 1: Create CumulativePnlChart**

Create `components/analytics/CumulativePnlChart.tsx`:
```typescript
'use client'

import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine,
} from 'recharts'
import { calcCumulativePnl } from '@/lib/calculations'
import type { Trade } from '@/types'

export function CumulativePnlChart({ closedTrades }: { closedTrades: Trade[] }) {
  const data = calcCumulativePnl(closedTrades)

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-white mb-4">Cumulative P&L</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
            <ReferenceLine y={0} stroke="#2A2A2A" />
            <XAxis dataKey="date" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `$${v}`} width={55} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#fff', fontSize: 12 }}
              formatter={(v: number) => [`$${v.toFixed(0)}`, 'P&L']} />
            <Line type="monotone" dataKey="cumPnl" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22C55E' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create MonthlyPnlChart**

Create `components/analytics/MonthlyPnlChart.tsx`:
```typescript
'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
} from 'recharts'
import { groupByMonth } from '@/lib/calculations'
import type { Trade } from '@/types'

export function MonthlyPnlChart({ closedTrades }: { closedTrades: Trade[] }) {
  const data = groupByMonth(closedTrades)

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-white mb-4">Monthly P&L</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#555', fontSize: 10 }} axisLine={false} tickLine={false}
              tickFormatter={(v: number) => `$${v}`} width={55} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#fff', fontSize: 12 }}
              formatter={(v: number) => [`$${v.toFixed(0)}`, 'Net Premium']} />
            <Bar dataKey="pnl" radius={[3, 3, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? '#22C55E' : '#F87171'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Create WinRateDonut**

Create `components/analytics/WinRateDonut.tsx`:
```typescript
'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { calcNetPremium } from '@/lib/calculations'
import type { Trade } from '@/types'

export function WinRateDonut({ closedTrades }: { closedTrades: Trade[] }) {
  const wins = closedTrades.filter(
    (t) => calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees) > 0
  ).length
  const losses = closedTrades.length - wins
  const data = [
    { name: 'Won', value: wins },
    { name: 'Lost', value: losses },
  ]
  const rate = closedTrades.length > 0 ? Math.round((wins / closedTrades.length) * 100) : 0

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-5 flex flex-col items-center">
      <h3 className="text-sm font-medium text-white mb-4 self-start">Win Rate</h3>
      {closedTrades.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm w-full">No data yet.</div>
      ) : (
        <>
          <div className="relative">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={data} cx={75} cy={75} innerRadius={50} outerRadius={70} dataKey="value" startAngle={90} endAngle={-270}>
                  <Cell fill="#22C55E" />
                  <Cell fill="#2A2A2A" />
                </Pie>
                <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#fff', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">{rate}%</span>
            </div>
          </div>
          <div className="flex gap-4 mt-2 text-xs text-text-muted">
            <span><span className="text-accent-green">●</span> Won: {wins}</span>
            <span><span className="text-border">●</span> Lost: {losses}</span>
          </div>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create TickerBreakdownTable**

Create `components/analytics/TickerBreakdownTable.tsx`:
```typescript
import { calcNetPremium, calcReturnOnCapital, calcCapitalSecured } from '@/lib/calculations'
import type { Trade } from '@/types'

export function TickerBreakdownTable({ closedTrades }: { closedTrades: Trade[] }) {
  const byTicker = new Map<string, Trade[]>()
  for (const t of closedTrades) {
    const arr = byTicker.get(t.ticker) ?? []
    arr.push(t)
    byTicker.set(t.ticker, arr)
  }

  const rows = Array.from(byTicker.entries())
    .map(([ticker, trades]) => {
      const totalNet = trades.reduce(
        (sum, t) => sum + calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees),
        0
      )
      const avgRoc =
        trades.reduce((sum, t) => {
          const net = calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees)
          const cap = calcCapitalSecured(t.strike_price, t.contracts)
          return sum + calcReturnOnCapital(net, cap)
        }, 0) / trades.length
      const wins = trades.filter(
        (t) => calcNetPremium(t.premium_in, t.premium_out, t.brokerage_fees) > 0
      ).length

      return { ticker, count: trades.length, totalNet, avgRoc, wins }
    })
    .sort((a, b) => b.totalNet - a.totalNet)

  return (
    <div className="bg-bg-panel border border-border rounded-lg overflow-hidden">
      <div className="px-5 py-3 border-b border-border">
        <h3 className="text-sm font-medium text-white">Per-Ticker Breakdown</h3>
      </div>
      {rows.length === 0 ? (
        <p className="text-text-muted text-sm px-5 py-6">No closed trades yet.</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Ticker', 'Trades', 'Net Premium', 'Avg ROC%', 'Win Rate'].map((h) => (
                <th key={h} className="py-2 px-5 text-left text-[10px] tracking-widest text-text-muted uppercase font-normal">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker} className="border-b border-border last:border-0 hover:bg-bg-hover transition-colors">
                <td className="py-2.5 px-5 font-semibold text-white text-sm">{r.ticker}</td>
                <td className="py-2.5 px-5 text-sm tabular-nums">{r.count}</td>
                <td className="py-2.5 px-5">
                  <span className={`text-sm tabular-nums font-medium ${r.totalNet >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                    {r.totalNet >= 0 ? '+' : ''}${Math.round(r.totalNet).toLocaleString()}
                  </span>
                </td>
                <td className="py-2.5 px-5 text-sm tabular-nums text-accent-purple">
                  {(r.avgRoc * 100).toFixed(2)}%
                </td>
                <td className="py-2.5 px-5 text-sm tabular-nums">
                  {Math.round((r.wins / r.count) * 100)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
```

- [ ] **Step 5: Create analytics page**

Create `app/analytics/page.tsx`:
```typescript
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
```

- [ ] **Step 6: Commit**

```bash
git add components/analytics/ app/analytics/
git commit -m "feat: add Analytics page with P&L charts, win rate donut, and ticker breakdown"
```

---

## Task 16: Root Redirect

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Create root redirect**

Replace `app/page.tsx`:
```typescript
import { redirect } from 'next/navigation'

export default function RootPage() {
  redirect('/dashboard')
}
```

- [ ] **Step 2: Verify full app flow**

```bash
npm run dev
```

- Navigate to http://localhost:3000 → should redirect to /dashboard
- Click "+ New Trade" → panel slides in → fill form → submit → trade appears in Positions
- Go to Positions → see the trade, live price loads, DTE bar shows correctly
- Close the trade from Positions → appears in History
- Analytics page shows updated charts

- [ ] **Step 3: Run tests**

```bash
npx jest --no-coverage
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add root redirect to dashboard, complete app"
```

---

## Task 17: Vercel Deployment

**Files:**
- Create: `.gitignore` additions

- [ ] **Step 1: Ensure .gitignore excludes secrets and build artifacts**

Verify `.gitignore` contains at minimum:
```
.env.local
.env*.local
.next/
node_modules/
.superpowers/
```

Run:
```bash
cat .gitignore
```

Add any missing entries if needed.

- [ ] **Step 2: Push to GitHub**

```bash
git remote add origin https://github.com/YOUR_USERNAME/wheel-tracker.git
git push -u origin main
```

- [ ] **Step 3: Deploy to Vercel**

Go to https://vercel.com → New Project → Import the GitHub repo.

In Vercel project settings → Environment Variables, add:
```
NEXT_PUBLIC_SUPABASE_URL        = your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY   = your_supabase_anon_key
NEXT_PUBLIC_FINNHUB_API_KEY     = your_finnhub_api_key
```

Click Deploy.

- [ ] **Step 4: Get Finnhub API key if needed**

Go to https://finnhub.io → Sign Up (free) → Dashboard → API Key. Copy into Vercel env vars and `.env.local`.

- [ ] **Step 5: Verify production**

Open the Vercel-provided URL (e.g. `wheel-tracker-xxx.vercel.app`). Verify:
- Dashboard loads with correct stat cards
- "+ New Trade" panel works
- Positions page shows live prices updating (will be `···` until Finnhub sends a trade tick for the ticker)
- History and Analytics pages load

- [ ] **Step 6: Final commit**

```bash
git add .gitignore
git commit -m "chore: finalize .gitignore for production deployment"
git push
```

---

## Self-Review Checklist

- [x] **Data model** — `trades` table with all fields from spec ✓
- [x] **Calculations** — all formulas in `lib/calculations.ts`, fully tested ✓
- [x] **Live prices** — `useFinnhubPrices` WebSocket hook, only active on Positions page ✓
- [x] **Unrealized P&L** — correct formula: `premiumIn - intrinsicValue × contracts × 100` for both CSP and CC ✓
- [x] **Trade entry** — slide-in panel with open/close/assign/roll modes ✓
- [x] **DTE bar** — colour coded green/amber/red, fills as expiry approaches ✓
- [x] **Wheel chain** — `linked_trade_id` FK, `↳` indicator in History, roll action pre-links ✓
- [x] **Four pages** — Dashboard, Positions, History, Analytics ✓
- [x] **Sidebar** — fixed left nav with "+ New Trade" button on every page ✓
- [x] **Obsidian Minimal theme** — all tokens in `tailwind.config.ts` ✓
- [x] **Vercel deployment** — env vars documented, `.gitignore` covers secrets ✓
