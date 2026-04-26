'use client'

import { useState, useEffect, useRef } from 'react'
import { MarketDataSubscriptionType } from '@tastytrade/api'
import { useTastytradeClient } from './useTastytradeClient'
import type { PriceMap } from '@/types'

export function useTastytradeQuotes(tickers: string[]): PriceMap {
  const { client } = useTastytradeClient()
  const [prices, setPrices] = useState<PriceMap>({})
  const tickersKey = [...tickers].sort().join(',')
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!client || tickers.length === 0) return

    let disposed = false

    async function connect() {
      try {
        if (!connectedRef.current) {
          await client!.quoteStreamer.connect()
          connectedRef.current = true
        }

        const removeListener = client!.quoteStreamer.addEventListener((events: any[]) => {
          if (disposed) return
          for (const event of events) {
            if (event.eventType === MarketDataSubscriptionType.Trade && event.price > 0) {
              setPrices((prev) => ({ ...prev, [event.eventSymbol]: event.price }))
            } else if (event.eventType === MarketDataSubscriptionType.Quote) {
              const mid = event.askPrice > 0 && event.bidPrice > 0
                ? (event.askPrice + event.bidPrice) / 2
                : event.askPrice || event.bidPrice
              if (mid > 0) {
                setPrices((prev) => ({ ...prev, [event.eventSymbol]: mid }))
              }
            }
          }
        })

        client!.quoteStreamer.subscribe(
          tickers,
          [MarketDataSubscriptionType.Trade, MarketDataSubscriptionType.Quote]
        )

        return removeListener
      } catch (err) {
        console.error('tastytrade quote streamer error:', err)
      }
    }

    let removeListener: (() => void) | undefined

    connect().then((r) => { removeListener = r })

    return () => {
      disposed = true
      if (removeListener) removeListener()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, tickersKey])

  return prices
}
