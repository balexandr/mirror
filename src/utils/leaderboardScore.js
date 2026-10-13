// Mirror's own definition of what counts as winning: fires used to
// land the beam, lower is better (matches the 'asc' sort_direction
// seeded for 'mirror' in leaderboard_games) — the same underlying
// number the in-game star rating (getStars/starsForFires) is bucketed
// from, just used directly here for finer resolution than 3 star tiers
// would give a leaderboard.
export function toLeaderboardScore(firesUsed) {
  return { score: firesUsed, tiebreak: null, scoreDisplay: `${firesUsed} fire${firesUsed === 1 ? '' : 's'}` }
}
