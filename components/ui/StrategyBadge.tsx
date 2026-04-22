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
