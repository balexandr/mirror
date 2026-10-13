// Mirror's own definition of what counts as winning: fires used to
// land the beam, lower is better (matches the 'asc' sort_direction
// seeded for 'mirror' in leaderboard_games) — the same underlying
// number the in-game star rating (getStars/starsForFires) is bucketed
// from, just used directly here for finer resolution than 3 star tiers
// would give a leaderboard. Only 1-3 possible values though, so ties are
// common — solve time breaks them (also 'asc' in leaderboard_games).
export function toLeaderboardScore(firesUsed, elapsedSeconds) {
  const fireLabel = `${firesUsed} fire${firesUsed === 1 ? '' : 's'}`
  if (elapsedSeconds == null) return { score: firesUsed, tiebreak: null, scoreDisplay: fireLabel }
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0')
  const ss = String(elapsedSeconds % 60).padStart(2, '0')
  return { score: firesUsed, tiebreak: elapsedSeconds, scoreDisplay: `${fireLabel} · ${mm}:${ss}` }
}
