// Core light-beam simulation. Pure functions, no React — shared by the game
// and by the puzzle-authoring/verification script (scripts/verify-puzzles.mjs).

const STEP = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };

// "/" mirror: right<->up, left<->down
function reflectSlash(dir) {
  return { right: 'up', up: 'right', left: 'down', down: 'left' }[dir];
}

// "\" mirror: right<->down, left<->up
function reflectBackslash(dir) {
  return { right: 'down', down: 'right', left: 'up', up: 'left' }[dir];
}

function cellKey(row, col) {
  return `${row},${col}`;
}

/**
 * Simulate one beam through a puzzle given the player's current mirror
 * placements in the interactive slots. Source/target default to the
 * puzzle's primary pair (`puzzle.source`/`puzzle.target`) but can be
 * overridden — this is how two-beam puzzles work: the same board, walls,
 * fixed mirrors, and slot mirrors are shared, and this function just gets
 * called twice with `puzzle.source2`/`puzzle.target2` for the second beam.
 *
 * @param {object} puzzle - { size, source, target, source2?, target2?, fixed: [{row,col,type,orientation}] }
 * @param {Record<string, '/'|'\\'>} mirrors - slot key -> orientation (absent/undefined = empty slot)
 * @param {{row:number,col:number,dir:string}} [source] - defaults to puzzle.source
 * @param {{row:number,col:number}} [target] - defaults to puzzle.target
 * @returns {{ cells: {row:number,col:number}[], result: 'win'|'wall'|'open'|'loop' }}
 */
export function simulateBeam(puzzle, mirrors, source = puzzle.source, target = puzzle.target) {
  const { size, fixed = [] } = puzzle;
  const fixedMap = {};
  for (const f of fixed) fixedMap[cellKey(f.row, f.col)] = f;

  let r = source.row;
  let c = source.col;
  let d = source.dir;

  const seenStates = new Set();
  const cells = [];
  let result = 'open';
  const maxSteps = size * size * 4;

  for (let i = 0; i < maxSteps; i++) {
    if (r < 0 || r >= size || c < 0 || c >= size) { result = 'open'; break; }

    const key = cellKey(r, c);
    const stateKey = `${key}|${d}`;
    if (seenStates.has(stateKey)) { result = 'loop'; break; }
    seenStates.add(stateKey);
    cells.push({ row: r, col: c });

    if (r === target.row && c === target.col) { result = 'win'; break; }

    const f = fixedMap[key];
    let mirrorType;
    if (f) {
      mirrorType = f.type === 'wall' ? 'wall' : f.orientation;
    } else {
      mirrorType = mirrors[key];
    }

    if (mirrorType === 'wall') { result = 'wall'; break; }
    if (mirrorType === '/') d = reflectSlash(d);
    else if (mirrorType === '\\') d = reflectBackslash(d);
    // otherwise: empty cell, beam continues straight

    const [dr, dc] = STEP[d];
    r += dr;
    c += dc;
  }

  return { cells, result };
}

export function isTwoBeamPuzzle(puzzle) {
  return Boolean(puzzle.source2 && puzzle.target2);
}

/**
 * A puzzle counts as solved when its primary beam reaches its target — and,
 * for a two-beam puzzle, the second beam reaches ITS target too, with the
 * exact same mirror layout. That shared-constraint requirement (one set of
 * mirrors has to work for both beams at once) is the whole difficulty of
 * the mode, not anything special in the simulation itself.
 */
export function isSolved(puzzle, mirrors) {
  if (simulateBeam(puzzle, mirrors, puzzle.source, puzzle.target).result !== 'win') return false;
  if (isTwoBeamPuzzle(puzzle)) {
    if (simulateBeam(puzzle, mirrors, puzzle.source2, puzzle.target2).result !== 'win') return false;
  }
  return true;
}

export function mirrorCount(mirrors) {
  return Object.values(mirrors).filter((v) => v === '/' || v === '\\').length;
}

export function cycleOrientation(current) {
  if (current === '/') return '\\';
  if (current === '\\') return undefined;
  return '/';
}

// Brute-force a minimal-mirror solution (same search the puzzle-authoring
// scripts use to verify par) — used for the loss-reveal screen, computed
// client-side on demand rather than baked into puzzle data, since it's cheap
// (3^slots, slots is always small) and never needs to ship to the browser
// as a spoiler sitting in the puzzle JSON. Uses isSolved, so it works the
// same way for one- and two-beam puzzles without any special-casing here.
export function findSolution(puzzle) {
  const slots = puzzle.slots;
  const n = slots.length;
  const ORIENTATIONS = [undefined, '/', '\\'];
  let best = null;
  let bestCount = Infinity;
  const total = Math.pow(3, n);
  for (let mask = 0; mask < total; mask++) {
    const mirrors = {};
    let m = mask;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const o = ORIENTATIONS[m % 3];
      m = Math.floor(m / 3);
      if (o) { mirrors[cellKey(slots[i].row, slots[i].col)] = o; count++; }
    }
    if (count >= bestCount) continue;
    if (isSolved(puzzle, mirrors)) {
      best = mirrors;
      bestCount = count;
    }
  }
  return best;
}
