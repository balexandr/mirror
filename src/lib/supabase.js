import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

// Stable per-device id, scoped per game (not shared across the suite —
// the leaderboard is per-game, so identity only needs to be stable
// within one game, across repeat plays).
export function getDeviceId(namespace) {
  const key = `${namespace}-leaderboard-device-id`
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}
