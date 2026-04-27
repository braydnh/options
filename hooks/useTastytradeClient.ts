'use client'

import { useState, useEffect, useRef } from 'react'

export interface TastytradeConfig {
  connected: boolean
  sessionToken: string
  accountNumber: string
}

let configSingleton: TastytradeConfig | null = null

export function useTastytradeClient() {
  const [config, setConfig] = useState<TastytradeConfig | null>(configSingleton)
  const [loading, setLoading] = useState(!configSingleton)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (configSingleton) return

    fetch('/api/tastytrade/config')
      .then((r) => r.json())
      .then((cfg) => {
        if (!mounted.current) return
        if (cfg.connected) {
          configSingleton = cfg
          setConfig(cfg)
        }
        setLoading(false)
      })
      .catch(() => { if (mounted.current) setLoading(false) })
  }, [])

  const isConnected = !!config?.connected
  // client kept for backward-compat !!client checks (sidebar, etc.)
  const client = isConnected ? config : null

  return { client, config, loading, isConnected }
}
