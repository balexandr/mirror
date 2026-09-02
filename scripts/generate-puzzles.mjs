// Offline puzzle generator for Mirror.
//
// Originally Mirror's difficulty ramped by TOTAL DAYS SINCE LAUNCH (single
// beam through day 21, two beams 22-75, three beams 76+) rather than by day
// of week like every other Noodle game. That meant "today's difficulty"
// depended on when you happened to check in relative to launch day, not on
// what day of the week it actually was - the opposite of what a daily
// puzzle should feel like. This regenerates from a chosen start date
// forward using a Mon-Sun difficulty table, same convention as Pathways/
// Sprout/Realm. Dates BEFORE the start date are left untouched (already
// shipped/possibly played - see GAME_DESIGN.md and the project memory for
// why editing puzzles someone may have already played is the wrong move).
//
// Reuses the exact simulation the game itself runs (src/utils/beam.js) to
// brute-force verify every generated puzzle - never ships a par value or a
// solvability claim that isn't independently checked.
//
// Generation is "construct then verify," same spirit as Pathways'
// Hamiltonian-path generator and Realm's carving algorithm. Pure random
// placement of sources/targets/obstacles turned out to be almost never
// solvable at all once you need 2+ beams sharing one mirror layout
// (measured ~2.6% solvable out of 2000 random attempts, and even those
// topped out at par 2 - never reaching the harder tiers' floor). Instead,
// each beam's path is walked deliberately from its source, choosing how
// many bends it needs and reserving every cell along the way so beams
// never clip each other's route - that guarantees at least one valid
// solution exists BEFORE the solver ever runs, so the retry loop is
// hunting for "meets this tier's difficulty floor," not "is solvable at
// all."
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { findSolution, mirrorCount } from '../src/utils/beam.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const START_DATE = process.argv[2] || '2026-08-25'; // first date to regenerate (inclusive)
const END_DATE = '2026-12-31'; // keep the suite's existing "don't run dry before year end" horizon

// Day of week difficulty table, Monday -> Sunday, same convention as
// Pathways/Sprout/Realm's WEEKLY_DIFFICULTY. `minPar` is a floor, not a
// target - candidates below it get rejected as too easy for that slot and
// regenerated, so difficulty only ratchets up through the week, never down.
//
// `size` now scales with the week too (5x5 Monday -> 9x9 Sunday, same
// curve Pathways uses) - it used to be a flat 9x9 every single day, which
// on a light Monday (1 beam, 3 slots) meant a huge mostly-empty board with
// a tiny handful of tappable cells scattered across it. A small board with
// a few slots reads as a real puzzle; a 9x9 board with 3 slots just reads
// as empty space with 3 buttons hiding in it.
const WEEKLY_DIFFICULTY = [
  { size: 5, beams: 1, slots: 4, fixed: 1, minPar: 3 }, // Monday
  { size: 6, beams: 1, slots: 5, fixed: 1, minPar: 3 }, // Tuesday
  { size: 7, beams: 1, slots: 5, fixed: 2, minPar: 4 }, // Wednesday
  { size: 7, beams: 2, slots: 6, fixed: 2, minPar: 4 }, // Thursday
  { size: 8, beams: 2, slots: 7, fixed: 3, minPar: 4 }, // Friday
  { size: 8, beams: 3, slots: 7, fixed: 3, minPar: 5 }, // Saturday
  { size: 9, beams: 3, slots: 8, fixed: 4, minPar: 5 }, // Sunday - the "boss day"
];

function difficultyForDate(dateKey) {
  const utcDay = new Date(`${dateKey}T00:00:00Z`).getUTCDay();
  const mondayIndexed = (utcDay + 6) % 7;
  return WEEKLY_DIFFICULTY[mondayIndexed];
}

function hashSeed(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function cellKey(r, c) { return `${r},${c}`; }

const STEP = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
// Same reflection rules as src/utils/beam.js (kept independent here so this
// script doesn't fight the game module's internal-only helpers).
const SLASH_OUT = { right: 'up', up: 'right', left: 'down', down: 'left' };
const BACK_OUT = { right: 'down', down: 'right', left: 'up', up: 'left' };

function turnOptions(dir) {
  return [
    { dirOut: SLASH_OUT[dir], orientation: '/' },
    { dirOut: BACK_OUT[dir], orientation: '\\' },
  ];
}

function edgeCellsWithDirs(size) {
  const out = [];
  for (let c = 0; c < size; c++) {
    out.push({ row: 0, col: c, dir: 'down' });
    out.push({ row: size - 1, col: c, dir: 'up' });
  }
  for (let r = 0; r < size; r++) {
    out.push({ row: r, col: 0, dir: 'right' });
    out.push({ row: r, col: size - 1, dir: 'left' });
  }
  return out;
}

function allCells(size) {
  const out = [];
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) out.push({ row: r, col: c });
  return out;
}

// Walks a single beam's intended route from its source, bending
// `desiredBends` times through freshly-chosen cells, then running a final
// stretch to land on a target. Every cell it touches gets returned so the
// caller can reserve the whole route - not just the bend cells - before
// placing anything else on the board.
function buildBeamPath(rng, startEdge, desiredBends, reserved, size) {
  let r = startEdge.row, c = startEdge.col, dir = startEdge.dir;
  if (reserved.has(cellKey(r, c))) return null;
  const pathCells = [cellKey(r, c)];
  const bendCells = [];

  for (let b = 0; b < desiredBends; b++) {
    const runLen = 1 + Math.floor(rng() * 3); // 1-3 straight steps before bending
    for (let s = 0; s < runLen; s++) {
      const [dr, dc] = STEP[dir];
      r += dr; c += dc;
      if (r < 0 || r >= size || c < 0 || c >= size) return null;
      const k = cellKey(r, c);
      if (reserved.has(k) || pathCells.includes(k)) return null;
      pathCells.push(k);
    }
    const options = turnOptions(dir);
    const choice = options[Math.floor(rng() * options.length)];
    bendCells.push({ row: r, col: c, orientation: choice.orientation });
    dir = choice.dirOut;
  }

  // Final run toward whatever cell becomes the target - stop early (rather
  // than fail) if it would leave the grid or cross a reserved cell, so a
  // short final leg is fine, it just makes for a closer target. But if the
  // very FIRST step of that run is already blocked, r/c never move past
  // the last bend cell - and since that cell is already in pathCells (and
  // about to become a slot), the "target" would silently end up being the
  // exact same cell as one of the slots. Caught this shipping in 35 of 134
  // already-generated puzzles: reject outright rather than let a beam's
  // target coincide with a slot/source cell.
  const finalRun = 1 + Math.floor(rng() * 4);
  let tookStep = false;
  for (let s = 0; s < finalRun; s++) {
    const [dr, dc] = STEP[dir];
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) break;
    const k = cellKey(nr, nc);
    if (reserved.has(k) || pathCells.includes(k)) break;
    r = nr; c = nc;
    pathCells.push(k);
    tookStep = true;
  }
  if (!tookStep) return null;

  return {
    source: { row: startEdge.row, col: startEdge.col, dir: startEdge.dir },
    target: { row: r, col: c },
    bendCells,
    pathCells,
  };
}

function buildCandidate(rng, tier) {
  const size = tier.size;
  const reserved = new Set();
  const edges = shuffle(edgeCellsWithDirs(size), rng);
  const interior = shuffle(allCells(size), rng);
  const bendsPerBeam = Math.ceil(tier.slots / tier.beams);

  const beams = [];
  const constructedSlots = [];
  let edgeIdx = 0;

  for (let i = 0; i < tier.beams; i++) {
    let built = null;
    for (let tries = 0; tries < 50 && edgeIdx < edges.length; tries++) {
      const src = edges[edgeIdx++];
      built = buildBeamPath(rng, src, bendsPerBeam, reserved, size);
      if (built) break;
    }
    if (!built) return null;

    for (const k of built.pathCells) reserved.add(k);
    reserved.add(cellKey(built.target.row, built.target.col));
    beams.push({ source: built.source, target: built.target });
    constructedSlots.push(...built.bendCells);
  }

  // Slots are the bend cells the construction actually needed, capped or
  // padded to EXACTLY the tier's slot count. bendsPerBeam is a ceiling
  // division (Math.ceil(tier.slots / tier.beams)) so it commonly overshoots
  // - e.g. 7 slots over 3 beams asks for 3 bends each, i.e. 9, not 7 - and
  // without capping that drift would silently make some days' boards bigger
  // than the difficulty table says. Dropped bend cells are still reserved
  // (never handed to something else), they just end up untappable floor
  // instead of a slot; findSolution re-verifies the WHOLE candidate
  // afterward regardless, so if capping happens to strand a beam the
  // candidate just fails solvability and gets retried, same as any other
  // rejected attempt - never ships un-checked.
  const cappedConstructed = constructedSlots.slice(0, tier.slots);
  const slots = cappedConstructed.map((b) => ({ row: b.row, col: b.col }));
  for (const cell of interior) {
    if (slots.length >= tier.slots) break;
    const key = cellKey(cell.row, cell.col);
    if (reserved.has(key)) continue;
    if (slots.some((s) => s.row === cell.row && s.col === cell.col)) continue;
    reserved.add(key);
    slots.push(cell);
  }
  if (slots.length < tier.slots) return null;

  const fixed = [];
  for (const cell of interior) {
    if (fixed.length >= tier.fixed) break;
    const key = cellKey(cell.row, cell.col);
    if (reserved.has(key)) continue;
    reserved.add(key);
    if (rng() < 0.5) fixed.push({ row: cell.row, col: cell.col, type: 'wall' });
    else fixed.push({ row: cell.row, col: cell.col, type: 'mirror', orientation: rng() < 0.5 ? '/' : '\\' });
  }
  if (fixed.length < tier.fixed) return null;

  return { size, beams, fixed, slots };
}

function generatePuzzle(dateKey, maxAttempts = 500) {
  const rng = mulberry32(hashSeed(dateKey));
  const tier = difficultyForDate(dateKey);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = buildCandidate(rng, tier);
    if (!candidate) continue;

    // findSolution brute-forces every combination of slot orientations
    // (3^slots, always small here - max 3^7 = 2187) and returns the
    // fewest-mirrors solution. Construction guarantees at least one valid
    // solve exists, so a null here would mean a bug in buildCandidate, not
    // an unlucky layout - this is belt-and-suspenders, not the main filter.
    const solution = findSolution(candidate);
    if (!solution) continue;

    const par = mirrorCount(solution);
    if (par < tier.minPar) continue; // decoy slots let the solver shortcut it - too easy, retry

    return { ...candidate, par };
  }

  throw new Error(`Failed to generate a puzzle meeting the difficulty floor for ${dateKey} after ${maxAttempts} attempts`);
}

function addDays(dateKey, n) {
  const d = new Date(`${dateKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function main() {
  const dataPath = join(__dirname, '..', 'src', 'data', 'puzzles.js');
  const existingSrc = readFileSync(dataPath, 'utf8');
  const existingMatch = existingSrc.match(/const puzzles = (\{[\s\S]*\});/);
  if (!existingMatch) throw new Error('Could not parse existing puzzles.js');
  // eslint-disable-next-line no-eval
  const existing = (0, eval)(`(${existingMatch[1]})`);

  const kept = {};
  for (const [date, puzzle] of Object.entries(existing)) {
    if (date < START_DATE) kept[date] = puzzle;
  }

  const generated = {};
  let cursor = START_DATE;
  while (cursor <= END_DATE) {
    generated[cursor] = generatePuzzle(cursor);
    cursor = addDays(cursor, 1);
  }

  const all = { ...kept, ...generated };
  const orderedKeys = Object.keys(all).sort();

  const lines = orderedKeys.map((date) => `  '${date}': ${JSON.stringify(all[date])},`);
  const header = `// Each puzzle: redirect the light beam(s) from source to target by placing
// mirrors ('/' or '\\\\') in the interactive slot cells. \`fixed\` cells are
// either walls (block the beam) or pre-set mirrors (forced bounces the
// player has to route around/through) baked into the puzzle. \`beams\` is
// an array - one beam for ordinary puzzles, several for puzzles where the
// SAME mirror layout has to route every beam to its own target at once,
// which is the whole difficulty of that mode. par = true minimum mirror
// count to solve every beam, brute-force verified against every
// combination of slot orientations (see GAME_DESIGN.md).
//
// Difficulty scales by DAY OF WEEK (see scripts/generate-puzzles.mjs's
// WEEKLY_DIFFICULTY table), same convention as Pathways/Sprout/Realm -
// Monday is easiest (1 beam), ramping to Sunday's 3-beam "boss day."
// Dates before ${START_DATE} predate that scheme and were left as-shipped
// rather than rewritten out from under anyone who'd already played them.
const puzzles = {
${lines.join('\n')}
};

export default puzzles;
`;

  writeFileSync(dataPath, header);
  console.log(`Kept ${Object.keys(kept).length} existing puzzles (before ${START_DATE}), generated ${Object.keys(generated).length} new ones (${START_DATE} through ${END_DATE}) -> ${dataPath}`);
}

main();
