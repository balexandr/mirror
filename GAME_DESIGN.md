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

## Difficulty pass (2026-08-17, later same day)

Day 1 (par 1, single slot) was "way too easy." Bumped difficulty
across the whole set, not just day one:

- **Grid: 5×5 → 7×7.** More room for longer, twistier paths. Cell
  gap drops to 4px at size ≥ 7 (was 6px) to keep tap targets
  comfortable at the smaller cell size — see the inline `gap` in
  `MirrorGrid.jsx`, everything else in the CSS is already
  size-agnostic (`gridTemplateColumns`/`Rows` computed from
  `puzzle.size`).
- **Par curve raised**: 2, 3, 3, 3, 4, 4, 4, 4, 5, 5, 4, 5, 5, 6
  (was 1, 1, 2, 2, 2, 2, 3, 2, 3, 3, 2, 3, 4, 3). 4–7 slots per
  puzzle and 1–3 walls, up from 1–5 slots / 0–1 walls.
- All 14 regenerated puzzles re-verified the same way as before:
  brute force over every slot-orientation combination confirms the
  stated `par` is the true minimum and that 0 mirrors never wins.
- Replayed puzzle #1's actual minimal solution end-to-end in a
  headless browser after the change to confirm the win path still
  fires correctly at the new size (it does — "Perfect beam!" at
  2/2 mirrors).

## "Nothing happens when I click" + "still too easy" (2026-08-17, later still)

Two reports at once. Investigated the click complaint first — it
turned out not to be a click-handling bug: fresh hit-tests, cycling
the same cell three times, and clicking every slot in sequence all
registered correctly in a real headless browser, every time. The
actual problem was **affordance**: on a 7×7 board only 4–7 of 49
cells are tappable, and the dashed-border cue wasn't loud enough —
most taps were landing on inert floor tiles and correctly doing
nothing, which reads as broken. Fixed for real, not dismissed:

- Slot cells now pulse (`slotInvite` keyframe — glow/border animate
  on a 2.2s loop) so they're unmistakable against the board.
- Floor cells got flattened further (no border glow, no gradient
  highlight) so they visually recede instead of competing with slots.
- Tapping floor now gets a quick `deniedFlash` (a soft red-tinted
  pulse, not an error state) instead of silently doing nothing — the
  UI always acknowledges a tap.
- Added an explicit on-screen hint: "Tap the glowing dashed cells to
  place mirrors."
- Fixed mirrors (pre-set obstacles) were being treated as tappable
  "floor" by accident — clicking one triggered the denied-flash even
  though it already visibly has a mirror on it. Gave them their own
  `.fixedMirror` style (dim/metallic, no glow, genuinely disabled)
  so they read as scenery, not a miss-click target.

Difficulty, on top of the 7×7 pass from earlier the same day:

- **7×7 → 9×9.** Cell gap already scales down at size ≥ 7; no other
  layout change needed.
- **Fixed mirrors introduced** (`fixed[].type: 'mirror'`) — forced
  bounces baked into the puzzle that the player has to route around
  or chain off of, not just walls to avoid. Puzzle generator now
  places 0–2 per puzzle alongside 2–4 walls.
- **Par curve raised again**: 3, 4, 4, 5, 5, 5, 5, 6, 6, 7, 5, 7, 7, 8
  (was 2–6 on the 7×7 pass). Not perfectly monotonic day to day
  (day 11 dips to 5) — normal for a daily-puzzle curve, not a bug.
- Puzzle generation script had a real bug of its own: it computed
  each puzzle's par to *filter* candidates but never attached that
  value to the puzzle object before writing it out, so 10 of 14
  puzzles briefly shipped with `par: undefined`. Caught before
  install by inspecting the generator's own output, not assumed —
  fixed by recomputing par from scratch (brute force, same as
  everywhere else) at install time instead of trusting a value that
  was never actually written.
- Re-verified the whole set the same way as every previous pass
  (brute force per puzzle, 0-mirror never wins) and replayed puzzle
  #1's real 3-mirror solution end-to-end in a browser — solved clean.

## The actual root cause of "clicking does nothing" (2026-08-17, evening)

Neither of the above was it. The real bug: today's puzzle (date key
`2026-08-17`) got redefined three times during the difficulty passes
above, but saved game state (`mirror-game-state` in localStorage) was
only ever keyed by *date*, never by puzzle *content*. If the original
trivially-easy par-1 puzzle got solved on the very first click during
early testing, `gameStatus: 'won'` persisted to localStorage under
that date key — and every redesign shipped under the same key since
then inherited that stale "already won" state, which disables every
slot (`disabled={won || ...}`). Disabled buttons still fire `:hover`
(so the UI looked alive) but never fire `click` (so nothing happened)
— explains both bug reports exactly, and why headless testing (fresh
browser profile every run, no persisted localStorage) never caught it.

Fix in `useGameState.js`: saved state now carries a `puzzleFingerprint`
(JSON of size/source/target/fixed/slots/par) alongside the date key;
`loadState` discards the save if today's puzzle doesn't match it
anymore. Self-healing for saves that already existed before this fix
too — they have no `puzzleFingerprint` field at all, so they mismatch
unconditionally and get dropped, no manual `localStorage.clear()`
needed. Verified by reproducing the exact failure (planted a
legacy-schema `won` save, reloaded, confirmed every slot reported
`disabled: true`) and then confirming the fix clears it.

**Lesson for future puzzle edits**: this class of bug can recur any
time a *shipped* day's puzzle is edited in place rather than only
ever appending new dates. The fingerprint check makes it safe now,
but the instinct going forward should still be to add new puzzles
rather than mutate a date that might already be in someone's
`localStorage`.
