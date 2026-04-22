# Wheel Options Tracker — Design Spec
**Date:** 2026-04-22
**Status:** Approved

---

## Overview

A personal desktop web app for tracking Wheel strategy options trades. Deployed to Vercel (no custom domain). Allows logging trades, visualising open positions with live P&L, tracking DTE, and reviewing historical performance analytics.

---

## Stack

| Layer | Choice | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | Full-stack, Vercel-native, server components + API routes |
| Database | Supabase (Postgres) | Free tier, managed, excellent Next.js integration |
| Live prices | Finnhub WebSocket | Real-time, free tier (60 req/min), no polling needed |
| Charts | Recharts | Well-supported React charting, lightweight |
| Styling | Tailwind CSS | Rapid utility styling, dark mode trivial |

---

## Visual Design

**Theme:** Obsidian Minimal  
**Background:** `#0F0F0F` (pure black)  
**Panels/cards:** `#1A1A1A`  
**Borders:** `#2A2A2A`  
**Text primary:** `#FFFFFF`  
**Text muted:** `#555555`  
**Accent green (profit):** `#22C55E`  
**Accent red (loss):** `#F87171`  
**Accent purple (UI/DTE):** `#A78BFA`  
**Accent amber (warning DTE):** `#F59E0B`

Layout: sidebar navigation (fixed left) + main content area. Desktop only.

---

## Database Schema (Supabase)

### `trades` table

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
```

No `price_cache` table — live prices come via Finnhub WebSocket and are never persisted.

### Computed values (client-side, never stored)

| Field | Formula |
|---|---|
| `net_premium` | `premium_in − premium_out − brokerage_fees` |
| `dte` | `expiry_date − today` |
| `capital_secured` | `strike_price × contracts × 100` |
| `realized_p_l` | `net_premium` (when status = closed or assigned) |
| `unrealized_p_l` | **CSP:** `premium_in − max(strike − stock_price, 0) × contracts × 100` / **CC:** `premium_in − max(stock_price − strike, 0) × contracts × 100`. Uses live stock price from Finnhub + the premium_in already stored. Ignores time value (theta/vega) — intrinsic-only approximation, conservative and sufficient for Wheel tracking. |
| `return_on_capital_pct` | `net_premium / capital_secured` |
| `annualized_return_pct` | `return_on_capital_pct × (365 / days_held)` |

---

## Environment Variables

```
NEXT_PUBLIC_FINNHUB_API_KEY=   # Finnhub free tier key (browser-visible, fine for personal use)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

No server-side secret required — Supabase anon key with RLS disabled (personal app, no auth needed).

---

## Application Structure

```
app/
  layout.tsx          # Root layout with sidebar
  page.tsx            # Redirects to /dashboard
  dashboard/
    page.tsx          # Dashboard page
  positions/
    page.tsx          # Open positions page
  history/
    page.tsx          # Closed trades page
  analytics/
    page.tsx          # Analytics page
components/
  sidebar/
    Sidebar.tsx       # Fixed left nav (Dashboard, Positions, History, Analytics, + Add Trade button)
  dashboard/
    StatsRow.tsx      # Four stat cards
    PositionsPreview.tsx  # Compact 5-row positions preview
    PnlChart.tsx      # Cumulative P&L line chart (Recharts)
  positions/
    PositionsTable.tsx    # Full open positions table with live prices
    PositionRow.tsx       # Single row: ticker, type badge, strike, live price, premium, P&L, DTE bar, actions
  history/
    HistoryTable.tsx      # Closed trades table with filter bar
  analytics/
    CumulativePnlChart.tsx
    MonthlyPnlChart.tsx
    WinRateDonut.tsx
    TickerBreakdownTable.tsx
  trade-panel/
    TradePanel.tsx        # Slide-in panel (right side), used for open + close + assign
    TradePanelForm.tsx    # Form inside the panel
  ui/
    DteBadge.tsx          # DTE number + colour (green/amber/red)
    DteBar.tsx            # Progress bar that fills as expiry approaches
    PnlBadge.tsx          # +/- value coloured green/red
    StrategyBadge.tsx     # CSP / CC pill badge
hooks/
  useFinnhubPrices.ts     # WebSocket hook — subscribes to tickers, returns price map
  useTrades.ts            # Supabase data fetching for trades
lib/
  supabase.ts             # Supabase client
  calculations.ts         # All P&L and DTE formulas
  finnhub.ts              # Finnhub WebSocket connection manager
```

---

## Pages

### Dashboard (`/dashboard`)

- **Stats row:** Total Realized P&L, Open Positions count, Win Rate (closed trades), This Month P&L
- **Open positions preview:** Compact table, max 5 rows, sorted by DTE ascending (most urgent first). "View all →" link to `/positions`
- **Cumulative P&L chart:** Line chart of realized P&L over time, one point per closed trade
- No live price WebSocket active on this page — shows last-known data

### Positions (`/positions`)

- Full table of all open trades sorted by DTE ascending
- **Columns:** Ticker, Type badge (CSP=purple / CC=green), Strike, Live Stock Price (live via Finnhub WS), Premium In, Unrealized P&L (calculated from live price + premium_in + strike), DTE bar + days count, Actions
- **Actions per row:** Close (opens slide-in with Premium Out field), Assign (marks as assigned, prompts for shares + cost basis), Roll (opens slide-in to log a new linked trade)
- Finnhub WebSocket subscribes to all open tickers on mount, unsubscribes on unmount
- DTE bar colour: >21d = green, 8–21d = amber, ≤7d = red

### History (`/history`)

- Table of all closed/assigned trades
- **Columns:** Ticker, Type, Strike, Expiry, Contracts, Premium In, Premium Out, Net Premium, ROC%, Outcome badge (Expired / Closed / Assigned), Date Closed
- Filter bar: ticker text input + date range picker
- Linked trades (CC following assignment) shown with subtle indent or "↳" indicator

### Analytics (`/analytics`)

- **Cumulative P&L line chart** — realized P&L over time
- **Monthly P&L bar chart** — net premium by calendar month
- **Win rate donut** — Expired/Closed profitably vs closed at a loss
- **Per-ticker breakdown table** — Ticker, Total Trades, Net Premium, Avg ROC%, Avg DTE at open

---

## Trade Entry Slide-in Panel

Triggered by "+ New Trade" button in sidebar, or "Close / Assign / Roll" row actions.

**Opening a new trade — fields:**
- Ticker (text, uppercase auto-format)
- Strategy (select: Cash-Secured Put / Covered Call) — auto-sets trade_type and opening_action
- Strike Price
- Expiry Date (date picker)
- Contracts (number, default 1)
- Premium In (number)
- Brokerage Fees (number, default 0)
- Notes (optional textarea)
- "Link to existing trade?" (optional — select open trade for Wheel chain tracking)

**Closing a trade — fields (pre-filled):**
- Premium Out
- Closing Action (auto: Buy to Close)
- Date Closed (default today)
- Outcome (Expired worthless / Closed for profit / Closed for loss / Assigned)

**Assigning a trade:**
- Marks status = assigned
- Prompts: Shares (auto: contracts × 100), Cost Basis
- Optionally opens a new Covered Call panel immediately after

---

## Live Price Feed

```
useFinnhubPrices(tickers: string[]) → { [ticker: string]: number }
```

- Opens a single Finnhub WebSocket on mount: `wss://ws.finnhub.io?token=${NEXT_PUBLIC_FINNHUB_API_KEY}`
- Subscribes to each ticker: `{"type":"subscribe","symbol":"AAPL"}`
- On `trade` message: updates price map in local state
- On unmount: sends `{"type":"unsubscribe"}` for each ticker, closes socket
- Only active on the Positions page and Dashboard preview (Dashboard uses stale-while-revalidate from Supabase, not live WS)

Finnhub free tier provides the underlying stock's last trade price. Combined with the stored `premium_in` and `strike_price`, unrealized P&L is calculated client-side using intrinsic value only (ignoring theta/vega). This is a conservative approximation — actual buyback cost will be slightly higher due to time value, meaning real P&L is slightly better than displayed. Sufficient for Wheel strategy tracking.

---

## Deployment

- Vercel free tier, no custom domain
- Supabase free tier (500MB, sufficient for personal trade log)
- Finnhub free tier (60 API calls/min, WebSocket supported)
- No auth — single-user personal app, no login required
- `.env.local` for local dev, Vercel environment variables for production
