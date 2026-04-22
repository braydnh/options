'use client'

import { useState, useEffect, useRef } from 'react'
import { FinnhubSocket } from '@/lib/finnhub'
import type { PriceMap } from '@/types'

async function fetchRestQuotes(tickers: string[], apiKey: string): Promise<PriceMap> {
  const results = await Promise.allSettled(
    tickers.map(async (ticker) => {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${apiKey}`
      )
      const data = await res.json()
      // c = current price, pc = previous close — use current, fall back to prev close
      const price: number = data.c > 0 ? data.c : data.pc
      return { ticker, price }
    })
  )
  const map: PriceMap = {}
  for (const r of results) {
    if (r.status === 'fulfilled' && r.value.price > 0) {
      map[r.value.ticker] = r.value.price
    }
  }
  return map
}

export function useFinnhubPrices(tickers: string[]): PriceMap {
  const [prices, setPrices] = useState<PriceMap>({})
  const socketRef = useRef<FinnhubSocket | null>(null)
  const tickersKey = tickers.sort().join(',')

  useEffect(() => {
    if (tickers.length === 0) return

    const apiKey = process.env.NEXT_PUBLIC_FINNHUB_API_KEY!

    // Immediately fetch REST quotes so prices show even outside market hours
    fetchRestQuotes(tickers, apiKey).then((restPrices) => {
      setPrices((prev) => ({ ...restPrices, ...prev }))
    })

    // Open WebSocket for live updates during market hours
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
