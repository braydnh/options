'use client'

import { useState, useEffect, useRef } from 'react'
import TastytradeClient from '@tastytrade/api'

export interface TastytradeConfig {
  connected: boolean
  clientId: string
  clientSecret: string
  refreshToken: string
  accountNumber: string
}

let clientSingleton: TastytradeClient | null = null
let configSingleton: TastytradeConfig | null = null

export function useTastytradeClient() {
  const [client, setClient] = useState<TastytradeClient | null>(clientSingleton)
  const [config, setConfig] = useState<TastytradeConfig | null>(configSingleton)
  const [loading, setLoading] = useState(!clientSingleton)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => { mounted.current = false }
  }, [])

  useEffect(() => {
    if (clientSingleton) return

    fetch('/api/tastytrade/config')
      .then((r) => r.json())
      .then((cfg: TastytradeConfig) => {
        if (!mounted.current) return
        if (!cfg.connected) {
          setLoading(false)
          return
        }
        const c = new TastytradeClient({
          ...TastytradeClient.ProdConfig,
          clientSecret: cfg.clientSecret,
          refreshToken: cfg.refreshToken,
          oauthScopes: ['read', 'openid'],
        } as any)
        clientSingleton = c
        configSingleton = cfg
        setClient(c)
        setConfig(cfg)
        setLoading(false)
      })
      .catch(() => {
        if (mounted.current) setLoading(false)
      })
  }, [])

  return { client, config, loading }
}
