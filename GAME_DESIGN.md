# Mirror — Game Design & Technical Guide

Status: **built** (2026-08-17) — see Implementation Notes at the bottom
for what changed from the original spec below.

## Concept

Daily light-redirect puzzle. A beam of light enters a grid from a fixed
edge. Player rotates/places mirrors on the grid to route the beam into
a target cell. One puzzle per day, deterministic, no fail state —
you optimize for fewest mirrors, not guesses.

## Core Mechanic

- Grid: 5×5 (tune after playtest; 5×5 keeps mobile taps comfortable).
- **Source**: fixed edge cell + direction the beam travels (e.g. row 0,
  col 2, heading down).
- **Target**: fixed cell the beam must enter.
- **Fixed obstacles**: some cells are pre-set walls or pre-set mirrors
  that can't be changed — these give each puzzle its shape.
- **Player cells**: empty cells the player taps to cycle through 3
  states: `empty → "/" → "\" → empty`.
- Beam path recalculates live on every tap — no submit button. This
  is more direct-manipulation than the other Noodle games (which are
  guess-and-submit); leans into "aha, click, watch the light move."
- Win = beam enters the target cell. Puzzle then locks and shows the
  result card.

## Beam Simulation

Simple raycast, one cell at a time from source:

```
dir vectors: up=(-1,0) down=(1,0) left=(0,-1) right=(0,1)

on entering a cell:
  if wall           -> beam stops here (dead end, not a win)
  if mirror "/"      -> right→up, left→down, up→right, down→left
  if mirror "\"      -> right→down, left→up, up→left, down→right
  if target cell      -> WIN, stop
  if empty            -> continue straight
  if exits grid bounds -> beam stops (dead end)
```

Recompute the full path from source every time any mirror changes —
grid is small, no perf concern.

## Scoring / Stars

- Each puzzle has a `par` (minimum mirrors needed to solve, set by
  puzzle author / solver script).
- 3 stars: solved using ≤ par mirrors
- 2 stars: par + 1–2
- 1 star: solved, over par by more
- Streak counts any solve, same as other games — stars are the
  "how well" layer, streak is the "did you show up" layer.

## Puzzle Data Format

```js
{
  size: 5,
  source: { row: 0, col: 2, dir: "down" },
  target: { row: 4, col: 2 },
  fixed: [
    { row: 2, col: 1, type: "wall" },
    { row: 2, col: 3, type: "mirror", orientation: "/" },
  ],
  par: 3,
}
```

Every puzzle needs a solver-verified unique solution at `par` — write
a small solver script (BFS over mirror placements in empty cells) to
validate before shipping puzzles, same spirit as Knot/Squint puzzle
QA.

## Shared Noodle Pattern Compliance

Per the standing suite rule (same footer/logo font/icon feel/share-by-text
across all NoodleGames):

- `getTodayKey()`: `Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })`
- Puzzle number: `Math.floor((today - EPOCH) / 86400000) + 1`
- localStorage: `mirror-game-state`, `mirror-stats`
- CSS Modules for styling
- How-to-play modal on first visit (localStorage flag)
- Stats modal with streak tracking
- Footer: `© YEAR NoodleGames.co • noodlegames.co`
- Share text: emoji result + noodlegames.co, e.g.
  `Mirror #12 💡💡💡 (3/3 mirrors) noodlegames.co`
- Deploy: `vite build && gh-pages -d dist`
- Icon: unique to Mirror, same visual weight/style as other game icons
  (suggest 🪞 or a custom light-beam glyph — check it reads at 16px
  before locking it in)

## Accent Color

Checked existing per-game accents to avoid collision:

| Game | Accent |
|---|---|
| odd_one_out | green #4ade80 / #22c55e |
| sequence | coral #ff6b4a |
| chain_link | purple #a855f7 |
| squint | cyan #06b6d4 |
| knot | rose #f43f5e |
| pathways | blue #3b82f6, gold #eab308, rose #f43f5e |

**Mirror accent: indigo `#6366f1`** — unused elsewhere, reads as
"glass/reflective," pairs well with a bright white/cyan glow for the
beam itself.

## Open Questions (resolve before build)

- Grid size — 5×5 vs 6×6, needs a mobile mockup to check tap targets.
- Does the beam ever need to hit *multiple* targets in one puzzle
  (higher difficulty tiers), or is it always single-target?
- Undo / reset button, or is cycling a mirror back to empty enough?
- Does hub `games.js` get an entry now (status: "coming soon") or only
  once built? (Other in-progress games aren't listed there yet either.)

## Implementation Notes (2026-08-17)

What actually shipped, and where it differs from the spec above:

- **Went with 5×5.** Reads fine at 420px mobile width with 6px gaps.
- **Single-target only** — matches the spec, no multi-target puzzles yet.
- **Added a `slots` field to puzzle data** — the biggest deviation.
  Originally *every* non-fixed cell was tappable. In practice that's
  25 tappable cells with only 2–4 that matter, which is noisy and
  makes brute-force par-verification (3^n combos) intractable for
  n≈20. Puzzles now declare an explicit `slots: [{row,col}, ...]`
  list — only those cells cycle `empty → "/" → "\" → empty`; every
  other non-fixed cell is inert floor the beam just passes through.
  This reads better (dashed border = "you can act here") and keeps
  brute force at 3^(slot count), fully tractable.
- **`par` is not asserted, it's computed.** Every shipped puzzle was
  brute-force solved by `scripts` run during authoring (see
  `src/utils/beam.js`'s `simulateBeam`, exercised against every
  combination of slot orientations) to find the *true* minimum
  mirror count — not just a number that happens to solve it. Also
  verified 0 mirrors never wins (no puzzle is accidentally trivial).
- **Reset button**, not undo — clears all placed mirrors at once.
  Simpler, and cycling a single slot back to empty covers the
  single-mistake case already.
- Added to `noodle_games` hub `games.js` and every sibling game's
  `shareAll.js` roster immediately on build (not deferred) — the hub
  listing already contained other actively-developed games, so
  "wait until built" turned out to mean "wait until this commit."
- Source direction/edge is derived from a single `{row, col, dir}`
  triple rather than a separate "edge" enum — `dir` alone (which way
  the beam travels on entry) is enough to know which board edge it's
  on and to compute the entry-arrow placement in the UI.
