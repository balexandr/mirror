# Mirror — Game Design & Technical Guide

Status: **designed, not built** (as of 2026-08-17)

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
