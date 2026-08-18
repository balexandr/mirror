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

## Mechanic pivot: hidden beam + limited fires (2026-08-17, night)

Bug fixed, board now genuinely playable — and immediately "still too
easy," a fourth time, despite par having gone from 1 to 3-8 across
three straight difficulty passes. The numbers weren't the problem.
The mechanic was: live beam redraw on every tap turns the puzzle into
a scanner — nudge a mirror, watch the light react, converge by
trial-and-error. No amount of par or board size fixes that, because
the feedback loop does the planning for you.

Real fix, not another number bump:

- **The beam is now hidden until you commit.** Tapping a slot still
  cycles its mirror and is always visible (spatial memory of your own
  plan is fair), but no beam trace renders at all until you press the
  new **Fire Beam** button.
- **Fires are capped at 5** (`MAX_FIRES` in `useGameState.js`), same
  shape as Wordle-style guess limits. Each fire snapshots the current
  mirror layout, simulates it, and reveals the trace as a result —
  win, or a dim "ghost" trace of that attempt while you adjust and
  fire again.
- **Real fail state, for the first time.** Out of fires without
  solving = loss for the day, board locks, come back tomorrow. Every
  previous version of Mirror had no fail state by design (see the
  original spec above) — that design was directly part of why it kept
  reading as easy, so it's gone.
- **Stars now reward fires, not mirrors.** 3★ solved in ≤2 fires, 2★
  in 3, 1★ in 4-5. Mirror-count par is still brute-force verified and
  shown as a bonus stat in the result screen, but it no longer gates
  the rating — the hard part is committing to a correct plan early,
  not shaving mirrors off an already-known-working layout.
- **Loss reveals a real solution**, computed live in-browser
  (`findSolution` in `beam.js`, same brute-force search the puzzle
  generator uses for par) and drawn on the board in a third beam
  color (green) distinct from both the indigo ghost and the gold win
  trace — not baked into puzzle data as a spoiler sitting in the JSON,
  computed on demand only when `gameStatus === 'lost'`.
- Stats gained an outcome dimension: `distribution[0]` is now losses
  (shown as "X" like Wordle), 1-3 are star counts on a win. Streak
  breaks to 0 on a loss, same as missing a day.

Verified all four render states in a real headless browser end to
end, not just built: beam fully absent pre-fire (0 `<line>` elements
in the DOM), a wrong shot leaving a dim ghost trace with fires
decrementing correctly, an actual par-3 solve won on fire 1/5, and a
deliberate 5-fire loss correctly revealing the solution in green on
the board underneath the result modal.

## Two-beam mode (2026-08-18)

Still "too simple" even with hidden beam + limited fires — asked the
user for a real design fork (new mechanic vs. push numbers further)
and they picked two beams sharing one board: a second source/target
pair gets added to a puzzle, and the SAME mirror layout has to route
BOTH beams to their own targets at once. A placement that helps beam A
can wreck beam B — that shared constraint, not bigger numbers, is what
makes these genuinely harder to plan.

Chose this over beam-splitter tiles specifically because it reuses the
verified single-beam engine untouched: `simulateBeam(puzzle, mirrors,
source, target)` now takes an optional source/target override
(defaults to `puzzle.source`/`puzzle.target`), so a two-beam puzzle is
just two calls against the same mirrors, no branching-path logic
needed anywhere. `isSolved(puzzle, mirrors)` is the one new piece of
truth — beam 1 must win, and beam 2 must win too if `source2`/`target2`
are present — and everything else (par brute force, `findSolution`,
the fire/loss loop) was rewritten in terms of `isSolved` instead of a
raw `simulateBeam(...).result === 'win'` check, so one-beam and
two-beam puzzles need zero special-casing anywhere but the renderer.

- Puzzle data: optional `source2`/`target2` fields, same shape as
  `source`/`target`. Absent = ordinary single-beam puzzle.
- `MirrorGrid` renders a second source/target pair (teal, vs. the
  primary's indigo/white) and a second beam trace with its own ghost
  color, so the two beams are never visually ambiguous.
- Day 1 (2026-08-17, already played) was left untouched. Days 2-14
  regenerated: day 1 stays single-beam, days 2-14 are all two-beam,
  par climbing roughly 4→8 (some day-to-day wobble is normal, not a
  bug — see the note on this from the first difficulty pass).
- Verified with the real puzzle for 2026-08-18 (today, live): both
  markers render (`Light source A/B`, `Target A/B` aria-labels each
  found exactly once), the actual brute-forced 5-mirror solution wins
  on fire 1/5, and — the important negative case — firing with only
  beam A's mirrors placed does NOT win; it correctly stays in
  `'playing'` with fires ticking down, showing beam A's ghost trace
  reaching its target while beam B's ghost trace sails past its own,
  untouched.
