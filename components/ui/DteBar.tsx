import { calcDte, dteColor, dteFillPercent } from '@/lib/calculations'
import { DteBadge } from './DteBadge'

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
