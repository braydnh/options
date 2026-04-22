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
