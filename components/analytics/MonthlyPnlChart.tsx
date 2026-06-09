'use client'

import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, LabelList,
} from 'recharts'
import { groupByMonth } from '@/lib/calculations'
import type { Trade } from '@/types'

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const { pnl, pct } = payload[0].payload
  const pos = pnl >= 0
  return (
    <div className="bg-[#1A1A1A] border border-[#333] rounded-lg px-3 py-2 text-xs shadow-lg">
      <p className="text-white font-medium mb-1">{label}</p>
      <p className={pos ? 'text-green-400' : 'text-red-400'}>
        {pos ? '+' : ''}${Math.round(pnl).toLocaleString('en-AU')}
      </p>
      <p className="text-slate-400">{pos ? '+' : ''}{pct.toFixed(2)}% on capital</p>
    </div>
  )
}

function PctLabel({ x, y, width, value, pnl }: any) {
  if (value === undefined) return null
  const pos = pnl >= 0
  const labelY = pos ? y - 6 : y + 14
  return (
    <text
      x={x + width / 2}
      y={labelY}
      textAnchor="middle"
      fontSize={10}
      fill={pos ? '#86efac' : '#fca5a5'}
    >
      {pos ? '+' : ''}{Number(value).toFixed(1)}%
    </text>
  )
}

export function MonthlyPnlChart({ closedTrades }: { closedTrades: Trade[] }) {
  const data = groupByMonth(closedTrades)

  return (
    <div className="bg-bg-panel border border-border rounded-lg p-5">
      <h3 className="text-sm font-medium text-white mb-4">Monthly P&L</h3>
      {data.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-text-muted text-sm">No data yet.</div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="month"
              tick={{ fill: '#aaa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: '#aaa', fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              width={45}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
            <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
              <LabelList
                content={(props: any) => (
                  <PctLabel {...props} value={props.value !== undefined ? data[props.index]?.pct : undefined} pnl={props.value} />
                )}
              />
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
