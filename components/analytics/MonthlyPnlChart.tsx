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
              tickFormatter={(v: unknown) => `$${Number(v)}`} width={55} />
            <Tooltip contentStyle={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, color: '#fff', fontSize: 12 }}
              formatter={(v: unknown) => [`$${Number(v).toFixed(0)}`, 'Net Premium']} />
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
