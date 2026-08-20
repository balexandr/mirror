# Mirror — Daily Light Puzzle

A daily puzzle game where you place mirrors to bend a beam of light onto its target — but the beam stays hidden until you commit to a shot.

Part of the [NoodleGames](https://noodlegames.co) family alongside **Knot** and **Pathways**.

---

## How to play

Tap the glowing dashed cells to cycle a mirror through `/` → `\` → empty. Mirror placement is always visible — the beam itself isn't, until you press **Fire Beam**.

- A fired shot reveals the beam's actual path and leaves a dim trace behind so you have something to react to before firing again.
- **5 fires per puzzle**, same shape as guesses in a word game. Solve it before they run out.
- Harder puzzles have **multiple beams sharing the same mirrors** — every beam has to land on its own target with one shared layout, so a placement that helps one can wreck another.
- Run out of fires without solving and the puzzle reveals a real solution (computed on the spot, never shipped in the puzzle data as a spoiler) — that's a loss for the day.
- Resets daily at **midnight ET**.

## Scoring

Stars reward planning, not mirror count: solve it in 1–2 fires for 3★, 3 fires for 2★, 4–5 fires for 1★. The minimum mirror count ("par") is still shown as a bonus stat, brute-force verified for every puzzle, but it doesn't gate the rating — committing to the right shot early does.

---

## Sharing

After a finish (win or loss) you can share your result — fires used out of 5, plus a star readout, or an `X/5` if you ran out. Once you've finished at least one NoodleGame today, a **Share all completed** button appears in the footer, letting you share every game you've solved today in one message.

---

## Stack

React + Vite · CSS Modules · localStorage · GitHub Pages

---

## Puzzles

Puzzles run from **August 20, 2026** (puzzle #1) through **December 31, 2026** — 134 days, keyed by date in `src/data/puzzles.js`. Each entry has a `size`, one or more `beams` (`{source, target}` pairs — more than one means the shared-mirror hard mode), `fixed` obstacles (walls and pre-set mirrors), the tappable `slots`, and a brute-force-verified `par`. Difficulty ramps from a single gentle beam in week one up to three beams sharing one board for the long steady state through year end.

See [GAME_DESIGN.md](./GAME_DESIGN.md) for the full design history — mechanic pivots, bugs found and fixed, and why things are built the way they are.
