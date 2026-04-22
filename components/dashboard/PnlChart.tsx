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
            formatter={(v: unknown) => [`$${Number(v).toFixed(0)}`, 'Cumulative P&L']}
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
