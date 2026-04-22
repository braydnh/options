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
