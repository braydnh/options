'use client'

import { useState, useEffect, useCallback } from 'react'
import { fetchTrades } from '@/lib/supabase'
import type { Trade } from '@/types'

interface UseTradesResult {
  trades: Trade[]
  openTrades: Trade[]
  closedTrades: Trade[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTrades(): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchTrades()
      setTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const openTrades = trades.filter((t) => t.status === 'open')
  const closedTrades = trades.filter((t) => t.status !== 'open')

  return { trades, openTrades, closedTrades, loading, error, refresh }
}
