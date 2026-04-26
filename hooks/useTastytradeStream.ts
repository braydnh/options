'use client'

import { useEffect, useRef } from 'react'
import { useTastytradeClient } from './useTastytradeClient'

export function useTastytradeStream(onFill: (order: any) => void) {
  const { client, config } = useTastytradeClient()
  const connectedRef = useRef(false)
  const onFillRef = useRef(onFill)
  onFillRef.current = onFill

  useEffect(() => {
    if (!client || !config?.accountNumber) return

    let disposed = false

    async function connect() {
      try {
        if (!connectedRef.current) {
          await client!.accountStreamer.start()
          await client!.accountStreamer.subscribeToAccounts([config!.accountNumber])
          connectedRef.current = true
        }

        const removeObserver = client!.accountStreamer.addMessageObserver((json: any) => {
          if (disposed) return
          if (json['type'] === 'PlacedOrder' && json['data']?.['status'] === 'Filled') {
            onFillRef.current(json['data'])
          }
        })

        return removeObserver
      } catch (err) {
        console.error('tastytrade account streamer error:', err)
      }
    }

    let removeObserver: (() => void) | undefined
    connect().then((r) => { removeObserver = r })

    return () => {
      disposed = true
      if (removeObserver) removeObserver()
    }
  }, [client, config?.accountNumber])
}
