'use client'

import { useState, useEffect, useRef } from 'react'
import { FinnhubSocket } from '@/lib/finnhub'
import type { PriceMap } from '@/types'

export function useFinnhubPrices(tickers: string[]): PriceMap {
  const [prices, setPrices] = useState<PriceMap>({})
  const socketRef = useRef<FinnhubSocket | null>(null)
  const tickersKey = tickers.sort().join(',')

  useEffect(() => {
    if (tickers.length === 0) return

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY!
    const socket = new FinnhubSocket(apiKey, (ticker, price) => {
      setPrices((prev) => ({ ...prev, [ticker]: price }))
    })
    socketRef.current = socket

    for (const ticker of tickers) {
      socket.subscribe(ticker)
    }

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey])

  return prices
}
