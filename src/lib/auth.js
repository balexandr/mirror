// Account layer on top of Supabase Auth — see LEADERBOARD_DESIGN.md's
// "All-Time Leaderboard (accounts)" section. Sign-in/out only ever runs
// on the hub (noodlegames.co/login, /logout); every other game just
// navigates there and reads the session the hub created, via the
// shared cookie storage set up in supabase.js. This file is meant to
// be the same shape in every game that has an all-time board, same
// convention as shareAll.js and leaderboard.js.
import { supabase } from './supabase'

const HUB = 'https://noodlegames.co'

export function signInUrl(returnTo = location.href) {
  return `${HUB}/login?return=${encodeURIComponent(returnTo)}`
}

export function signOutUrl(returnTo = location.href) {
  return `${HUB}/logout?return=${encodeURIComponent(returnTo)}`
}

export async function getCurrentUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data?.user ?? null
}

// Fires once on mount with the current user (or null), then again on
// every sign-in/sign-out — including one that happened on a different
// subdomain, since both read the same cookie-backed session.
export function onAuthStateChange(callback) {
  if (!supabase) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user ?? null)
  })
  return () => data.subscription.unsubscribe()
}

export async function getDisplayName(userId) {
  if (!supabase || !userId) return null
  const { data } = await supabase
    .from('player_profiles')
    .select('display_name')
    .eq('user_id', userId)
    .maybeSingle()
  return data?.display_name ?? null
}
