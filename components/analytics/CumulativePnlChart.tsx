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
              tickFormatter={(v: unknown) => `$${Number(v)}`} width={55} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#fff', fontSize: 12 }}
              formatter={(v: unknown) => [`$${Number(v).toFixed(0)}`, 'P&L']} />
            <Line type="monotone" dataKey="cumPnl" stroke="#22C55E" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#22C55E' }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
