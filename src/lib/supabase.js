import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cross-subdomain auth session storage — see LEADERBOARD_DESIGN.md's
// "All-Time Leaderboard (accounts)" section. Every NoodleGame is its
// own subdomain; Supabase's default session storage is localStorage,
// which is per-origin, so a sign-in on one game wouldn't be visible on
// another. This persists the session in a cookie scoped to
// .noodlegames.co instead — only the hub (noodlegames.co/login) ever
// runs the actual OAuth flow, every game just reads the session it
// creates. Accepted tradeoff (not HttpOnly, since the client needs to
// read it) is written up in that doc.
const SESSION_COOKIE = 'noodle_session'

function cookieDomain() {
  return typeof location !== 'undefined' && location.hostname.endsWith('noodlegames.co')
    ? '.noodlegames.co'
    : ''
}

const cookieAuthStorage = {
  getItem() {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]*)`))
      return match ? decodeURIComponent(match[1]) : null
    } catch {
      return null
    }
  },
  setItem(_key, value) {
    try {
      // Google/GitHub OAuth sessions carry a lot of bulky profile data
      // (full avatar URL, duplicated identities array, a separate
      // provider API token) this app never reads — Avatar.jsx and
      // player_profiles.display_name replace all of it. Keeping the
      // full session JSON pushed well past a browser's ~4KB per-cookie
      // limit, which gets silently REFUSED rather than truncated, so
      // nothing was ever actually getting stored. Strip to just what a
      // session needs to keep working.
      const parsed = JSON.parse(value)
      const trimmed = {
        access_token: parsed.access_token,
        refresh_token: parsed.refresh_token,
        expires_at: parsed.expires_at,
        expires_in: parsed.expires_in,
        token_type: parsed.token_type,
        user: parsed.user
          ? { id: parsed.user.id, aud: parsed.user.aud, role: parsed.user.role, email: parsed.user.email }
          : null,
      }
      const domain = cookieDomain()
      const secure = location.protocol === 'https:' ? '; secure' : ''
      document.cookie = `${SESSION_COOKIE}=${encodeURIComponent(JSON.stringify(trimmed))}; max-age=8640000; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}${secure}`
    } catch {}
  },
  removeItem() {
    try {
      const domain = cookieDomain()
      document.cookie = `${SESSION_COOKIE}=; max-age=0; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}`
    } catch {}
  },
}

export const supabase = url && anonKey
  ? createClient(url, anonKey, { auth: { storage: cookieAuthStorage } })
  : null

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
