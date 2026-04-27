import { createClient } from '@supabase/supabase-js'
import type { Trade } from '@/types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function fetchTrades(): Promise<Trade[]> {
  const { data, error } = await supabase
    .from('trades')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data as Trade[]
}

export async function insertTrade(input: Omit<Trade, 'id' | 'created_at'>): Promise<Trade> {
  const { data, error } = await supabase
    .from('trades')
    .insert(input)
    .select()
    .single()

  if (error) throw error
  return data as Trade
}

export async function updateTrade(id: string, updates: Partial<Trade>): Promise<void> {
  const { error } = await supabase
    .from('trades')
    .update(updates)
    .eq('id', id)

  if (error) throw error
}

export async function deleteTrade(id: string): Promise<void> {
  const { error } = await supabase.from('trades').delete().eq('id', id)
  if (error) throw error
}
