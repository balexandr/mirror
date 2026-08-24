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

## Animated fire, pluralized to N beams, and pushed much harder (2026-08-18, later)

Solved the two-beam puzzle in 5 seconds. Three requests landed at
once: animate the fire, "pluralize it," and make it much harder — the
second one turned out to be the right lever for the third.

- **Generalized two-beam → N-beam.** `puzzle.source`/`target`/
  `source2`/`target2` (hardcoded to exactly two) is gone. Puzzle data
  now has a single `beams: [{source, target}, ...]` array — one entry
  for an ordinary puzzle, three for the new hardest tier. Nothing
  else needed to change to support it: `isSolved` is
  `puzzle.beams.every(b => simulateBeam(...).result === 'win')`, and
  `findSolution`, the fire loop, and the loss-reveal all already went
  through `isSolved`, so N-beam support was "delete the hardcoded
  pair, add a loop" rather than new logic anywhere.
- **MirrorGrid renders a 3-color palette** (indigo/white beam 0, teal
  beam 1, magenta beam 2, cycling by index if a puzzle ever has more)
  for sources, targets, and ghost traces, so three simultaneous shots
  stay visually unambiguous. Win/loss states still share one outcome
  color (gold/green) across all beams — only the ghost (still-playing)
  state is per-beam-colored.
- **Fire animation**: each segment of a fired trace draws itself in
  via `stroke-dashoffset`, normalized with the SVG `pathLength="1"`
  attribute so the animation works regardless of a segment's actual
  on-screen length or the percentage coordinate system — no need to
  compute real pixel lengths. Segments stagger via a `--seg-index`
  CSS custom property (~70ms apart) so the beam visibly "travels"
  through each bend in firing order rather than just appearing.
  `fireId` (bumped on every fire, never persisted) is folded into each
  `<line>`'s React key purely so the elements remount — and the
  once-per-mount CSS animation actually replays — on every shot, not
  just the first. Gotcha hit and fixed: the CSS `animation` shorthand
  fully replaces rather than merges, so the win state (which needs
  BOTH the draw-in and an infinite pulse) needed one compound
  `.beamLineWon.beamDraw` rule listing both animations explicitly —
  two separate class rules each setting `animation` just clobber each
  other. Verified live: captured three segments mid-fire with
  different `stroke-dashoffset` values (0.22 / 0.66 / 1.0), confirming
  the stagger is real, not just present in the CSS source.
- **Difficulty**: days 2-14 are now three-beam (day 1, already
  played, stays single-beam). Puzzle generation switched from
  "search for an exact/threshold par" (which the two-beam pass used,
  and which turned out to scale badly — a full-target search at 3
  beams took 10+ minutes per puzzle and sometimes never converged) to
  "best-of-N random candidates, keep the hardest one found" — bounded,
  predictable runtime regardless of how rare a high par is. Par
  landed at 3, then 5,5,6,7,6,5,6,6,7,5,6,5,5 for days 2-14. Every
  puzzle still individually brute-force verified the same as always
  (true minimum par, 0-mirror never wins) — "best-of-N" only changed
  how candidates get proposed, not how a chosen one gets verified.

## Entry-arrow bug (2026-08-18, later still)

User asked to "fix the tiny arrows" showing beam direction. Turned out
to be a real, longstanding bug, not just a sizing complaint: the
`arrowPlacement` switch statement had the horizontal cases backwards
from day one — `dir: 'right'` (entering the left edge, travelling
into the grid) got the glyph `◂`, which points left, away from the
grid; `dir: 'left'` got `▸`, same mistake the other way. Vertical
cases (`up`/`down`) were correct, so this only ever showed on beams
entering from the left or right edge — easy to miss since roughly
half of edge-entering beams wouldn't trigger it.

Fixed by removing the hand-picked-glyph-per-case pattern entirely,
which is how the mismatch slipped in unnoticed: `arrowPlacement` now
just returns the real travel direction, and the renderer draws one
SVG arrowhead (`<path d="M2 2 L14 8 L2 14 Z">`, points right by
default) rotated via CSS `transform: rotate()` — 0/90/180/270 for
right/down/left/up. A single shape can't independently get one
direction backwards the way four hand-picked unicode glyphs could.
Also fixes the "tiny" complaint as a side effect: text-glyph
triangles (▾▴◂▸) render inconsistently sized across fonts/platforms;
a 16×16 SVG with its own `filter: drop-shadow` glow is crisp and
consistent regardless of the browser's font.

Verified against today's actual puzzle (2026-08-18), which has a real
`dir: 'right'` beam — exactly the previously-broken case. Confirmed
via computed `transform` on the arrow SVG (`rotate(0deg)` for the
right-travelling beam, `90deg`/`270deg` for down/up) and visually:
the magenta arrow on the left edge now points right, into the grid,
matching its beam's actual direction of travel.

## Two more bugs, same conversation (2026-08-20)

"Make the beam colors starting and ending match, the OG is white and
ends at yellow" + "arrows need to line up better" — both real, both
fixed:

- **Color mismatch**: beam 0's source used `var(--beam)` (light
  lavender/white) but its target used `var(--win)` (gold) — the
  "starts white, ends yellow" the user described exactly. Beams 1/2
  (teal/magenta) never had this bug; their `.beam2Marker`/
  `.beam3Marker` rules already color source and target the same. Fix
  was to bring beam 0 in line with that existing pattern rather than
  invent a new one: `.target`/`.targetHit` now use the same lavender
  hue as `.source`/`.sourceGlyph` instead of gold.
- **Arrow misalignment**: the entry-arrow `<span>` is a child of
  `.boardFrame`, which is 2×`--board-pad` (40px) wider than the grid
  the position percentage was actually computed against (`.gridWrap`
  sits inset by that padding on every side). A plain `left: {pos}%`
  was therefore only correct by coincidence at dead center — up to a
  full `--board-pad` off at the edges. Couldn't just move the arrows
  inside `.gridWrap` to fix the coordinate space, either — it has
  `overflow: hidden`, so anything positioned outside its own box (as
  the arrows need to be, to sit outside the grid) would get clipped.
  Fixed with `calc()` instead: `left: calc(var(--board-pad) + (100% -
  var(--board-pad) * 2) * pos-as-fraction)`, keeping the arrows as
  boardFrame children but correcting for the padding offset in the
  math. `--board-pad` is a real CSS custom property on `.boardFrame`
  now (was a bare `20px` in the padding declaration), so the JS and
  CSS can't drift out of sync the way a duplicated magic number would.

Verified both by comparing each source cell's actual bounding-box
center to its arrow's center in a real browser: alignment landed
within 1-3.5px on both axes (previously up to ~20px off), and the
target reticles now visibly match their own source's color instead of
the primary beam alone showing gold.

## Reset to day 1, puzzles through year end (2026-08-20)

2026-08-17 through 2026-08-19 were build/iteration days, not real
puzzle history — the puzzle under each of those date keys got
rewritten wholesale five separate times (grid size, hidden-beam
mechanic, two-beam, N-beam, multiple difficulty passes). Reset for a
real launch:

- `EPOCH` moved from `2026-08-17` to `2026-08-20` — today is puzzle
  #1 again, for real this time.
- Generated puzzles through **2026-12-31** (134 days) so the game
  doesn't run dry. Difficulty curve: days 1-7 single-beam gentle
  ramp, 8-21 single-beam medium, 22-75 two-beam, 76-134 three-beam
  steady state (with an occasional two-beam breather day — every
  11th day in that tier) for the rest of the year.
- Generation used the same "best-of-N random candidates, keep the
  hardest found" approach as the three-beam pass, but with modest N
  (250-700 depending on tier) — at this scale (134 puzzles) the goal
  was every puzzle being genuinely verified and reasonably varied,
  not each one individually pushed to its hardest possible par the
  way a single showcase puzzle might be. Par landed in the 1-7 range
  across the set, which is expected variance from best-of-N at modest
  N, not a bug — every single one is still real brute-force-verified
  par (true minimum, 0-mirror confirmed unsolvable), same as always.
  Whole 134-puzzle generation run completed in well under two
  minutes — three-beam brute force at 7-8 slots turned out cheap
  enough that N in the hundreds, not thousands, was sufficient.
- Verified live: today's puzzle now shows `#1`, 2026-12-31 shows
  `#134`, and 2027-01-01 (one day past the dataset) still falls back
  cleanly to the existing "no puzzle yet" state with no errors.

Mirror was already listed in `noodle_games/games.js` and every
sibling game's `shareAll.js` roster from the initial build
(2026-08-17) — re-checked, still intact, no action needed there.

## Difficulty switched to day-of-week (2026-08-23)

The days-since-launch curve above (1-21 single-beam, 22-75 two-beam,
76-134 three-beam) meant "today's difficulty" depended on when you
happened to start playing relative to launch day, not on what day of
the week it actually was — the user noticed this directly ("I did it
today and it was just one beam" on what was, coincidentally, a Sunday
— the day that should be hardest under a weekday scheme). Every other
Noodle game with escalating difficulty (Pathways, Sprout, Realm)
already scales by day of week, not launch day — Mirror was the
outlier.

Rebuilt `scripts/generate-puzzles.mjs` from scratch (it never existed
as a committed file before — the original generation was ad-hoc and
only its OUTPUT was ever saved to `puzzles.js`, closing a real gap
flagged by `beam.js`'s own header comment referencing a
`scripts/verify-puzzles.mjs` that never actually existed in the repo).

- New `WEEKLY_DIFFICULTY` table, Monday (1 beam, par floor 1) ramping
  to Sunday (3 beams, par floor 4, the "boss day").
- Dates before 2026-08-24 (i.e. 2026-08-20 through 2026-08-23, already
  shipped and likely already played) were left completely untouched —
  only 2026-08-24 onward was regenerated. Same "don't rewrite a puzzle
  someone may have already played" rule from the EPOCH reset history
  above; the existing puzzleFingerprint save-guard would have made it
  *safe* either way, but there's no reason to touch played history.
- **Pure-random source/target/obstacle placement turned out to almost
  never be solvable once 2+ beams share one mirror layout** — measured
  ~2.6% solvable out of 2000 random attempts for a 2-beam tier, and
  even those topped out at par 2, never reaching the harder tiers'
  floor. Fixed by constructing each beam's path deliberately (walk a
  random number of bends from its source, reserving every cell the
  route touches) before ever calling the solver — this guarantees at
  least one valid solution exists, so the retry loop is hunting for
  "meets this tier's difficulty floor," not "is solvable at all." That
  jumped it to 100% solvable with a real spread of par values.
- Reused `findSolution`/`mirrorCount` straight from `src/utils/beam.js`
  (the exact function the client uses for its own loss-reveal screen)
  to brute-force verify every generated puzzle's par — no separate
  reimplementation to drift out of sync.
- **Caught and fixed a shape-drift bug before shipping**: bend count
  per beam was computed as `Math.ceil(tier.slots / tier.beams)`, which
  commonly overshoots (7 slots over 3 beams asks for 3 bends each = 9,
  not 7) — Sunday's puzzles were shipping with 9 tappable slots
  instead of the intended 7 until a re-verification pass that checks
  actual shape against the difficulty table (not just solvability)
  caught it. Fixed by capping constructed bend cells to the tier's
  exact slot count before padding/output.
- All 130 regenerated puzzles (2026-08-24 through 2026-12-31)
  independently re-verified after the fix: exact shape match to the
  difficulty table (beams/slots/fixed counts), par re-derived from
  scratch via `findSolution` and compared against the shipped value,
  zero mismatches, zero unsolvable puzzles.
- Verified live end-to-end (not just the offline solver): mocked the
  browser's clock to a Monday and to a Sunday, played each real
  generated puzzle's true solution through the actual UI, both
  produced "Perfect beam!" with the exact expected par.

## Grid size now scales by weekday too (2026-08-24)

Grid was a flat 9x9 every day regardless of tier. On a light Monday
(1 beam, 3 slots) that meant a huge mostly-empty 81-cell board with 3
tappable cells lost somewhere in it — user feedback, verbatim: "the
map was like 9x9 but the puzzle was very tiny." Added `size` to the
`WEEKLY_DIFFICULTY` table, same 5→9 curve Pathways already uses:
Monday 5x5 up to Sunday 9x9. `buildCandidate`/`buildBeamPath` now take
`tier.size` instead of a fixed global constant.

Regenerated from **2026-08-24 (today) forward**, not just tomorrow —
normally a puzzle someone may have already played is left untouched
(see the EPOCH-reset history above), but the user's report named today
specifically, so today got rebuilt too rather than leaving the exact
thing they were pointing at broken until tomorrow. Mirror's
puzzleFingerprint save-guard makes this safe either way.

**Found and fixed a real, pre-existing bug while re-verifying**, unrelated
to the size change: `buildBeamPath`'s final run toward the target could
have its very first step blocked (out of bounds or into a reserved
cell) and silently leave `r,c` at the last bend's position without
moving — meaning the beam's "target" came out identical to one of its
own slot cells. Scanned the full 134-puzzle set for it: **35 of 134
already-shipped puzzles had a target cell that coincided with a
slot/fixed/source cell** (target rendered disabled per
`MirrorGrid.jsx`'s disabled-if-`isTarget` check, so nothing was
literally unplayable, but the target cell also carried slot styling —
a real visual bug, and a latent trap for anything that assumes those
groups are disjoint). Fixed by rejecting the beam construction outright
if the final run can't take even one step, instead of returning a
degenerate path. Re-verification now explicitly checks every
source/target/fixed/slot cell across a puzzle is mutually distinct, in
addition to shape/solvability/par — 130 regenerated puzzles (today
onward), zero collisions, zero shape mismatches, zero par mismatches.
- Verified live again post-fix: solved today's real (now 5x5) puzzle
  through the actual UI — 3 mirrors, par 3, "Perfect beam!" — and
  screenshotted the board to confirm it visually reads as a real
  puzzle now, not empty space with a few buttons in it.
