// Shared leaderboard client, same shape in every game that has one (see
// noodle_games/LEADERBOARD_DESIGN.md). Deliberately knows nothing about
// any one game's scoring rules — it only sorts/compares using whatever
// sort_direction/tiebreak_direction that game's own leaderboard_games
// config row says, and submits whatever { score, tiebreak, scoreDisplay }
// that game's own toLeaderboardScore() computed. A new game with a new
// way of winning never needs this file to change.
import { supabase, getDeviceId } from '../lib/supabase'

// Matches the submit_score RPC's own cutoff (noodle_games/LEADERBOARD_DESIGN.md)
// — these are low-traffic daily puzzles, a 10-slot board rarely filled and
// read as less exclusive than a top-3 one. Changed from 10 to 3 on 2026-10-13.
export const LEADERBOARD_SIZE = 3

function isBetter(a, b, direction) {
  return direction === 'asc' ? a < b : a > b
}

export function sortRows(rows, config) {
  return [...rows].sort((a, b) => {
    if (a.score !== b.score) {
      return config.sort_direction === 'asc' ? a.score - b.score : b.score - a.score
    }
    if (config.tiebreak_direction && a.tiebreak != null && b.tiebreak != null) {
      return config.tiebreak_direction === 'asc' ? a.tiebreak - b.tiebreak : b.tiebreak - a.tiebreak
    }
    return 0
  })
}

// Client-side pre-check only, purely for UX (whether to show the
// initials prompt at all). The RPC re-checks authoritatively at
// submit time, since another score could land between this check and
// the actual submit.
export function wouldQualify(score, rows, config) {
  if (!config || rows.length < LEADERBOARD_SIZE) return true
  const betterCount = rows.filter((r) => isBetter(r.score, score, config.sort_direction)).length
  return betterCount < LEADERBOARD_SIZE
}

export async function fetchTodayBoard(gameId, dateKey) {
  if (!supabase) return { rows: [], config: null }
  const [{ data: config }, { data: rows }] = await Promise.all([
    supabase.from('leaderboard_games').select('sort_direction, tiebreak_direction').eq('game_id', gameId).single(),
    supabase.from('leaderboard_scores').select('device_id, initials, score, tiebreak, score_display').eq('game_id', gameId).eq('date', dateKey),
  ])
  if (!config) return { rows: [], config: null }
  return { rows: sortRows(rows || [], config), config }
}

// This device's own row in today's board, if it's already submitted
// one — used to skip the initials prompt entirely on a repeat visit
// instead of re-asking just because the board still has fewer than
// LEADERBOARD_SIZE entries (wouldQualify alone can't tell "you're
// already on it" from "there's room for you").
export function findMyRow(gameId, rows) {
  const deviceId = getDeviceId(gameId)
  return rows.find((r) => r.device_id === deviceId) || null
}

export async function submitScore(gameId, { score, tiebreak = null, scoreDisplay, initials }) {
  if (!supabase) return { accepted: false, rank: null }
  const { data, error } = await supabase.rpc('submit_score', {
    p_game_id: gameId,
    p_device_id: getDeviceId(gameId),
    p_score: score,
    p_tiebreak: tiebreak,
    p_score_display: scoreDisplay,
    p_initials: initials,
  })
  if (error || !data?.[0]) return { accepted: false, rank: null }
  return { accepted: data[0].accepted, rank: data[0].rank }
}

const INITIALS_COOKIE = 'noodle_initials'

// Shared across every game on *.noodlegames.co (cookie Domain, not
// localStorage, which is walled off per subdomain) so a player only ever
// types their initials once, not on every game and every day. Falls back
// to a host-only cookie in dev, where the noodlegames.co domain attribute
// wouldn't match and the browser would just drop it.
function cookieDomain() {
  return typeof location !== 'undefined' && location.hostname.endsWith('noodlegames.co')
    ? '.noodlegames.co'
    : ''
}

export function getSavedInitials() {
  try {
    const match = document.cookie.match(/(?:^|;\s*)noodle_initials=([^;]*)/)
    return match ? decodeURIComponent(match[1]) : ''
  } catch {
    return ''
  }
}

export function saveInitials(initials) {
  try {
    const domain = cookieDomain()
    document.cookie = `${INITIALS_COOKIE}=${encodeURIComponent(initials)}; max-age=31536000; path=/; samesite=lax${domain ? `; domain=${domain}` : ''}`
  } catch {}
}
