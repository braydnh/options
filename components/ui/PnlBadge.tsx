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
