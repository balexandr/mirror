import { useState } from 'react';
import styles from './MirrorGrid.module.css';

function cellKey(row, col) {
  return `${row},${col}`;
}

// Where the entry arrow sits, just outside the board, and which way it points.
function arrowPlacement(source, size) {
  const cellPct = 100 / size;
  const center = (n) => (n + 0.5) * cellPct;
  switch (source.dir) {
    case 'down': return { side: 'top', pos: center(source.col), glyph: '▾' };
    case 'up': return { side: 'bottom', pos: center(source.col), glyph: '▴' };
    case 'right': return { side: 'left', pos: center(source.row), glyph: '◂' };
    case 'left': return { side: 'right', pos: center(source.row), glyph: '▸' };
    default: return null;
  }
}

/**
 * @param mirrors   the mirror layout to render as glyphs — the player's own
 *                   current placement while playing, or the revealed
 *                   solution's layout on a loss.
 * @param beam       {cells,result} to trace, or null to show no beam at all
 *                   (the pre-fire state — the whole point of the mechanic).
 * @param beamStyle  'win' | 'lost' | 'ghost' — which visual treatment the
 *                   beam trace gets. Ghost = a dim trace of the last shot,
 *                   shown while still playing so you get feedback without
 *                   live-updating on every tap.
 * @param interactive whether slot cells respond to taps at all.
 */
export default function MirrorGrid({ puzzle, mirrors, beam, beamStyle, interactive, poppedSlot, onToggleSlot }) {
  const { size, source, target, fixed = [], slots } = puzzle;
  // Floor is most of a big board and isn't a mirror slot — tapping it should
  // never feel like nothing happened, so it gets a quick "not tappable" flash.
  const [deniedCell, setDeniedCell] = useState(null);

  const fixedMap = {};
  for (const f of fixed) fixedMap[cellKey(f.row, f.col)] = f;
  const slotSet = new Set(slots.map((s) => cellKey(s.row, s.col)));
  const beamCells = beam ? beam.cells : [];
  const beamCellSet = new Set(beamCells.map((c) => cellKey(c.row, c.col)));

  const cellPct = 100 / size;
  const centerPct = (n) => (n + 0.5) * cellPct;

  // Prepend an entry point off the edge so the beam visibly originates outside the board.
  const entry = arrowPlacement(source, size);
  let entryPoint = null;
  if (entry) {
    if (entry.side === 'top') entryPoint = { x: centerPct(source.col), y: 0 };
    else if (entry.side === 'bottom') entryPoint = { x: centerPct(source.col), y: 100 };
    else if (entry.side === 'left') entryPoint = { x: 0, y: centerPct(source.row) };
    else entryPoint = { x: 100, y: centerPct(source.row) };
  }
  const beamPoints = beam
    ? [...(entryPoint ? [entryPoint] : []), ...beamCells.map((c) => ({ x: centerPct(c.col), y: centerPct(c.row) }))]
    : [];
  // Draw as separate <line> segments (not a <polyline> — its `points` attribute
  // takes plain numbers only, no "%" support) so coordinates can stay in the
  // same percentage space as the CSS grid, with no viewBox scaling of stroke-width.
  const beamSegments = beamPoints.slice(1).map((p, i) => ({ from: beamPoints[i], to: p }));
  const beamLineClass =
    beamStyle === 'win' ? styles.beamLineWon
    : beamStyle === 'lost' ? styles.beamLineSolution
    : styles.beamLineGhost;

  return (
    <div className={styles.boardFrame}>
      {entry && (
        <span
          className={`${styles.entryArrow} ${styles[`side${entry.side[0].toUpperCase()}${entry.side.slice(1)}`]}`}
          style={{
            [entry.side === 'top' || entry.side === 'bottom' ? 'left' : 'top']: `${entry.pos}%`,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {entry.glyph}
        </span>
      )}

      <div className={styles.gridWrap}>
        {/* pointerEvents set both here (belt) and in CSS (suspenders) — this
            overlay spans the whole board, so if a browser doesn't inherit
            `pointer-events: none` from <svg> onto <line> the way Chromium
            does, every click anywhere on the grid gets silently swallowed. */}
        <svg className={styles.beamSvg} pointerEvents="none" aria-hidden="true">
          {beamSegments.map((seg, i) => (
            <line
              key={i}
              x1={`${seg.from.x}%`} y1={`${seg.from.y}%`}
              x2={`${seg.to.x}%`} y2={`${seg.to.y}%`}
              pointerEvents="none"
              className={`${styles.beamLine} ${beamLineClass}`}
            />
          ))}
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
              const isSource = r === source.row && c === source.col;
              const isTarget = r === target.row && c === target.col;
              const f = fixedMap[key];
              const isWall = f?.type === 'wall';
              const isFixedMirror = f?.type === 'mirror';
              const isSlot = slotSet.has(key);
              const orientation = isFixedMirror ? f.orientation : mirrors[key];
              const onBeam = beamCellSet.has(key);
              const popped = poppedSlot === key;
              // Fixed mirrors are scenery the beam bounces off, same as a wall —
              // not a slot, and not "floor" either, so they get neither the
              // tap-to-place behavior nor the denied-flash meant for empty floor.
              const isFloor = !isSource && !isTarget && !isWall && !isSlot && !isFixedMirror;
              const denied = deniedCell === key;

              let cls = styles.cell;
              if (isWall) cls += ` ${styles.wall}`;
              if (isSource) cls += ` ${styles.source}`;
              if (isTarget) cls += ` ${styles.target}`;
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
                    isSource ? 'Light source'
                    : isTarget ? 'Target'
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
