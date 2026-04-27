'use client'

import type { PriceMap } from '@/types'

// SDK-based streaming removed; live quotes use Finnhub (useFinnhubPrices)
export function useTastytradeQuotes(_tickers: string[]): PriceMap {
  return {}
}
