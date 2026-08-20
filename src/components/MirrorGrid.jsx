import { useState } from 'react';
import styles from './MirrorGrid.module.css';

function cellKey(row, col) {
  return `${row},${col}`;
}

// Where an entry arrow sits, just outside the board, and which way it points.
// Bug fixed here: the left/right cases used to hand back a glyph pointing
// AWAY from the grid (dir 'right' — entering the left edge, travelling
// in — got a left-pointing glyph, and 'left' got a right-pointing one).
// Up/down were fine; only the horizontal cases were backwards. Now this
// just returns the actual travel direction and the renderer draws an SVG
// arrowhead rotated to match it, rather than trusting a hand-picked glyph
// per case (which is how the mismatch slipped in unnoticed).
function arrowPlacement(source, size) {
  const cellPct = 100 / size;
  const center = (n) => (n + 0.5) * cellPct;
  switch (source.dir) {
    case 'down': return { side: 'top', pos: center(source.col), dir: 'down' };
    case 'up': return { side: 'bottom', pos: center(source.col), dir: 'up' };
    case 'right': return { side: 'left', pos: center(source.row), dir: 'right' };
    case 'left': return { side: 'right', pos: center(source.row), dir: 'left' };
    default: return null;
  }
}

// Degrees to rotate a right-pointing arrowhead so it points the given way.
const ARROW_ROTATION = { right: 0, down: 90, left: 180, up: 270 };

// Turns a beam's {cells,result} into drawable <line> segments in the same
// 0-100 percentage space as the CSS grid, prefixed with an entry point off
// the board edge so the trace visibly originates from outside it.
function beamToSegments(beam, source, size) {
  if (!beam) return [];
  const cellPct = 100 / size;
  const centerPct = (n) => (n + 0.5) * cellPct;
  const entry = arrowPlacement(source, size);
  let entryPoint = null;
  if (entry) {
    if (entry.side === 'top') entryPoint = { x: centerPct(source.col), y: 0 };
    else if (entry.side === 'bottom') entryPoint = { x: centerPct(source.col), y: 100 };
    else if (entry.side === 'left') entryPoint = { x: 0, y: centerPct(source.row) };
    else entryPoint = { x: 100, y: centerPct(source.row) };
  }
  const points = [
    ...(entryPoint ? [entryPoint] : []),
    ...beam.cells.map((c) => ({ x: centerPct(c.col), y: centerPct(c.row) })),
  ];
  return points.slice(1).map((p, i) => ({ from: points[i], to: p }));
}

// Ghost-state color per beam index — indigo (beam 0, the CSS default with
// no modifier), teal (1), magenta (2). Cycles if a puzzle ever has more
// than 3 beams, though nothing currently generates that many.
const GHOST_CLASS_BY_INDEX = ['beamLineGhost', 'beamLineGhost2', 'beamLineGhost3'];
const MARKER_CLASS_BY_INDEX = [null, 'beam2Marker', 'beam3Marker'];
const ENTRY_CLASS_BY_INDEX = [null, 'entryArrow2', 'entryArrow3'];

/**
 * @param mirrors    the mirror layout to render as glyphs — the player's own
 *                    current placement while playing, or the revealed
 *                    solution's layout on a loss.
 * @param beams       array parallel to puzzle.beams: {cells,result} per beam,
 *                     or null (pre-fire — the whole point of the mechanic:
 *                     nothing renders until a shot is committed).
 * @param beamStyle   'win' | 'lost' | 'ghost' — visual treatment shared by
 *                     ALL beam traces (the outcome is shared: you only win
 *                     when every beam lands). Ghost = each beam's own dim,
 *                     distinctly-colored trace of the last shot.
 * @param fireId       increments on every fire — included in each beam
 *                      line's key so it remounts (and its draw-in animation
 *                      replays) on every shot, not just the first one.
 * @param interactive whether slot cells respond to taps at all.
 */
export default function MirrorGrid({ puzzle, mirrors, beams, beamStyle, fireId, interactive, poppedSlot, onToggleSlot }) {
  const { size, fixed = [], slots } = puzzle;
  const puzzleBeams = puzzle.beams;
  // Floor is most of a big board and isn't a mirror slot — tapping it should
  // never feel like nothing happened, so it gets a quick "not tappable" flash.
  const [deniedCell, setDeniedCell] = useState(null);

  const fixedMap = {};
  for (const f of fixed) fixedMap[cellKey(f.row, f.col)] = f;
  const slotSet = new Set(slots.map((s) => cellKey(s.row, s.col)));

  const onBeamCellSet = new Set();
  (beams || []).forEach((b) => { if (b) b.cells.forEach((c) => onBeamCellSet.add(cellKey(c.row, c.col))); });

  const sourceMap = {}; // cellKey -> beam index (for source cells)
  const targetMap = {}; // cellKey -> beam index (for target cells)
  puzzleBeams.forEach((b, i) => {
    sourceMap[cellKey(b.source.row, b.source.col)] = i;
    targetMap[cellKey(b.target.row, b.target.col)] = i;
  });

  return (
    <div className={styles.boardFrame}>
      {puzzleBeams.map((b, i) => {
        const entry = arrowPlacement(b.source, size);
        if (!entry) return null;
        const entryModClass = ENTRY_CLASS_BY_INDEX[i % ENTRY_CLASS_BY_INDEX.length];
        return (
          <span
            key={i}
            className={`${styles.entryArrow} ${entryModClass ? styles[entryModClass] : ''} ${styles[`side${entry.side[0].toUpperCase()}${entry.side.slice(1)}`]}`}
            style={{
              // NOT a plain `${pos}%` — this span is positioned relative to
              // boardFrame's own box, which is 2×--board-pad WIDER than the
              // grid the % was computed against (gridWrap sits inset by
              // that padding). A plain percentage was off by up to a full
              // --board-pad at the edges (correct only by coincidence at
              // dead center), which is what "arrows not lined up" was.
              [entry.side === 'top' || entry.side === 'bottom' ? 'left' : 'top']:
                `calc(var(--board-pad) + (100% - (var(--board-pad) * 2)) * ${entry.pos / 100})`,
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          >
            <svg
              viewBox="0 0 16 16"
              width="16"
              height="16"
              style={{ transform: `rotate(${ARROW_ROTATION[entry.dir]}deg)` }}
            >
              <path d="M2 2 L14 8 L2 14 Z" fill="currentColor" />
            </svg>
          </span>
        );
      })}

      <div className={styles.gridWrap}>
        {/* pointerEvents set both here (belt) and in CSS (suspenders) — this
            overlay spans the whole board, so if a browser doesn't inherit
            `pointer-events: none` from <svg> onto <line> the way Chromium
            does, every click anywhere on the grid gets silently swallowed. */}
        <svg className={styles.beamSvg} pointerEvents="none" aria-hidden="true">
          {puzzleBeams.map((b, beamIdx) => {
            const trace = beams ? beams[beamIdx] : null;
            const segments = beamToSegments(trace, b.source, size);
            const lineClass =
              beamStyle === 'win' ? styles.beamLineWon
              : beamStyle === 'lost' ? styles.beamLineSolution
              : styles[GHOST_CLASS_BY_INDEX[beamIdx % GHOST_CLASS_BY_INDEX.length]];
            return segments.map((seg, i) => (
              <line
                // fireId in the key forces a remount (not just an attribute
                // update) on every shot, so the draw-in animation — which
                // only plays once per mount — actually replays each time.
                key={`beam${beamIdx}-fire${fireId}-${i}`}
                x1={`${seg.from.x}%`} y1={`${seg.from.y}%`}
                x2={`${seg.to.x}%`} y2={`${seg.to.y}%`}
                pathLength="1"
                pointerEvents="none"
                className={`${styles.beamLine} ${lineClass} ${styles.beamDraw}`}
                style={{ '--seg-index': i }}
              />
            ));
          })}
        </svg>

        <div
          className={styles.grid}
          style={{
            gridTemplateColumns: `repeat(${size}, 1fr)`,
            gridTemplateRows: `repeat(${size}, 1fr)`,
            gap: size >= 7 ? '4px' : '6px',
          }}
        >
          {Array.from({ length: size }).map((_, r) =>
            Array.from({ length: size }).map((__, c) => {
              const key = cellKey(r, c);
              const sourceBeamIdx = sourceMap[key];
              const targetBeamIdx = targetMap[key];
              const isSource = sourceBeamIdx !== undefined;
              const isTarget = targetBeamIdx !== undefined;
              const f = fixedMap[key];
              const isWall = f?.type === 'wall';
              const isFixedMirror = f?.type === 'mirror';
              const isSlot = slotSet.has(key);
              const orientation = isFixedMirror ? f.orientation : mirrors[key];
              const onBeam = onBeamCellSet.has(key);
              const popped = poppedSlot === key;
              // Fixed mirrors are scenery the beam bounces off, same as a wall —
              // not a slot, and not "floor" either, so they get neither the
              // tap-to-place behavior nor the denied-flash meant for empty floor.
              const isFloor = !isSource && !isTarget && !isWall && !isSlot && !isFixedMirror;
              const denied = deniedCell === key;

              const beamIdx = isSource ? sourceBeamIdx : isTarget ? targetBeamIdx : 0;
              const markerModClass = MARKER_CLASS_BY_INDEX[beamIdx % MARKER_CLASS_BY_INDEX.length];

              let cls = styles.cell;
              if (isWall) cls += ` ${styles.wall}`;
              if (isSource) cls += ` ${styles.source}`;
              if (isTarget) cls += ` ${styles.target}`;
              if (markerModClass) cls += ` ${styles[markerModClass]}`;
              if (isTarget && beamStyle === 'win') cls += ` ${styles.targetHit}`;
              if (isSlot && !orientation) cls += ` ${styles.slotEmpty}`;
              if (isFixedMirror) cls += ` ${styles.fixedMirror}`;
              else if (orientation) cls += ` ${styles.hasMirror}`;
              if (onBeam) cls += ` ${styles.onBeam}`;
              if (popped) cls += ` ${styles.popped}`;
              if (denied) cls += ` ${styles.denied}`;

              return (
                <button
                  key={key}
                  type="button"
                  className={cls}
                  disabled={!interactive || isWall || isSource || isTarget || isFixedMirror}
                  onClick={() => {
                    if (!interactive) return;
                    if (isSlot) onToggleSlot(r, c);
                    else if (isFloor) {
                      setDeniedCell(key);
                      setTimeout(() => setDeniedCell(null), 260);
                    }
                  }}
                  aria-label={
                    isSource ? `Light source${puzzleBeams.length > 1 ? ' ' + String.fromCharCode(65 + sourceBeamIdx) : ''}`
                    : isTarget ? `Target${puzzleBeams.length > 1 ? ' ' + String.fromCharCode(65 + targetBeamIdx) : ''}`
                    : isWall ? 'Wall'
                    : isFixedMirror ? `Fixed mirror, permanently set to ${orientation}`
                    : isSlot ? `Mirror slot, row ${r + 1} column ${c + 1}${orientation ? `, mirror set to ${orientation}` : ', empty'}`
                    : 'Floor, not tappable'
                  }
                >
                  {isWall && <span className={styles.wallGlyph} aria-hidden="true" />}
                  {orientation && (
                    <span className={styles.mirrorGlyph} aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="70%" height="70%">
                        <line
                          x1={orientation === '/' ? 3 : 3}
                          y1={orientation === '/' ? 17 : 3}
                          x2={orientation === '/' ? 17 : 17}
                          y2={orientation === '/' ? 3 : 17}
                          stroke="currentColor"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                  )}
                  {isTarget && (
                    <span className={styles.targetGlyph} aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="60%" height="60%">
                        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="10" cy="10" r="3" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                  {isSource && <span className={styles.sourceGlyph} aria-hidden="true" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
