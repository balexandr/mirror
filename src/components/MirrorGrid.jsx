import { useState } from 'react';
import styles from './MirrorGrid.module.css';

function cellKey(row, col) {
  return `${row},${col}`;
}

// Where an entry arrow sits, just outside the board, and which way it points.
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

/**
 * @param mirrors    the mirror layout to render as glyphs — the player's own
 *                    current placement while playing, or the revealed
 *                    solution's layout on a loss.
 * @param beam        {cells,result} for the primary beam, or null to show no
 *                     beam at all (the pre-fire state — the whole point of
 *                     the mechanic).
 * @param beam2       same, for the second beam on a two-beam puzzle. null
 *                     for ordinary single-beam puzzles.
 * @param beamStyle   'win' | 'lost' | 'ghost' — visual treatment for BOTH
 *                     beam traces (the outcome is shared: on a two-beam
 *                     puzzle you only win when both land). Ghost = a dim
 *                     trace of the last shot, shown while still playing.
 * @param interactive whether slot cells respond to taps at all.
 */
export default function MirrorGrid({ puzzle, mirrors, beam, beam2, beamStyle, interactive, poppedSlot, onToggleSlot }) {
  const { size, source, target, source2, target2, fixed = [], slots } = puzzle;
  const hasBeam2 = Boolean(source2 && target2);
  // Floor is most of a big board and isn't a mirror slot — tapping it should
  // never feel like nothing happened, so it gets a quick "not tappable" flash.
  const [deniedCell, setDeniedCell] = useState(null);

  const fixedMap = {};
  for (const f of fixed) fixedMap[cellKey(f.row, f.col)] = f;
  const slotSet = new Set(slots.map((s) => cellKey(s.row, s.col)));
  const beamCellSet = new Set((beam ? beam.cells : []).map((c) => cellKey(c.row, c.col)));
  const beam2CellSet = new Set((beam2 ? beam2.cells : []).map((c) => cellKey(c.row, c.col)));

  const beamSegments = beamToSegments(beam, source, size);
  const beam2Segments = hasBeam2 ? beamToSegments(beam2, source2, size) : [];
  const beamLineClass =
    beamStyle === 'win' ? styles.beamLineWon
    : beamStyle === 'lost' ? styles.beamLineSolution
    : styles.beamLineGhost;
  // Beam 2 gets its own hue so the two traces are never ambiguous, but only
  // while still playing (ghost) — a win or loss reveal is a shared outcome,
  // so both traces match at that point same as the sources/targets do.
  const beam2LineClass = beamStyle === 'ghost' ? styles.beamLineGhost2 : beamLineClass;

  const entries = [arrowPlacement(source, size)];
  if (hasBeam2) entries.push(arrowPlacement(source2, size));

  return (
    <div className={styles.boardFrame}>
      {entries.map((entry, i) => entry && (
        <span
          key={i}
          className={`${styles.entryArrow} ${i === 1 ? styles.entryArrow2 : ''} ${styles[`side${entry.side[0].toUpperCase()}${entry.side.slice(1)}`]}`}
          style={{
            [entry.side === 'top' || entry.side === 'bottom' ? 'left' : 'top']: `${entry.pos}%`,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          {entry.glyph}
        </span>
      ))}

      <div className={styles.gridWrap}>
        {/* pointerEvents set both here (belt) and in CSS (suspenders) — this
            overlay spans the whole board, so if a browser doesn't inherit
            `pointer-events: none` from <svg> onto <line> the way Chromium
            does, every click anywhere on the grid gets silently swallowed. */}
        <svg className={styles.beamSvg} pointerEvents="none" aria-hidden="true">
          {beamSegments.map((seg, i) => (
            <line
              key={`b1-${i}`}
              x1={`${seg.from.x}%`} y1={`${seg.from.y}%`}
              x2={`${seg.to.x}%`} y2={`${seg.to.y}%`}
              pointerEvents="none"
              className={`${styles.beamLine} ${beamLineClass}`}
            />
          ))}
          {beam2Segments.map((seg, i) => (
            <line
              key={`b2-${i}`}
              x1={`${seg.from.x}%`} y1={`${seg.from.y}%`}
              x2={`${seg.to.x}%`} y2={`${seg.to.y}%`}
              pointerEvents="none"
              className={`${styles.beamLine} ${beam2LineClass}`}
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
              const isSource2 = hasBeam2 && r === source2.row && c === source2.col;
              const isTarget2 = hasBeam2 && r === target2.row && c === target2.col;
              const f = fixedMap[key];
              const isWall = f?.type === 'wall';
              const isFixedMirror = f?.type === 'mirror';
              const isSlot = slotSet.has(key);
              const orientation = isFixedMirror ? f.orientation : mirrors[key];
              const onBeam = beamCellSet.has(key) || beam2CellSet.has(key);
              const popped = poppedSlot === key;
              // Fixed mirrors are scenery the beam bounces off, same as a wall —
              // not a slot, and not "floor" either, so they get neither the
              // tap-to-place behavior nor the denied-flash meant for empty floor.
              const isFloor = !isSource && !isTarget && !isSource2 && !isTarget2 && !isWall && !isSlot && !isFixedMirror;
              const denied = deniedCell === key;

              let cls = styles.cell;
              if (isWall) cls += ` ${styles.wall}`;
              if (isSource) cls += ` ${styles.source}`;
              if (isTarget) cls += ` ${styles.target}`;
              if (isSource2) cls += ` ${styles.source} ${styles.beam2Marker}`;
              if (isTarget2) cls += ` ${styles.target} ${styles.beam2Marker}`;
              if ((isTarget || isTarget2) && beamStyle === 'win') cls += ` ${styles.targetHit}`;
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
                  disabled={!interactive || isWall || isSource || isTarget || isSource2 || isTarget2 || isFixedMirror}
                  onClick={() => {
                    if (!interactive) return;
                    if (isSlot) onToggleSlot(r, c);
                    else if (isFloor) {
                      setDeniedCell(key);
                      setTimeout(() => setDeniedCell(null), 260);
                    }
                  }}
                  aria-label={
                    isSource ? 'Light source A'
                    : isTarget ? 'Target A'
                    : isSource2 ? 'Light source B'
                    : isTarget2 ? 'Target B'
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
                  {(isTarget || isTarget2) && (
                    <span className={styles.targetGlyph} aria-hidden="true">
                      <svg viewBox="0 0 20 20" width="60%" height="60%">
                        <circle cx="10" cy="10" r="7.5" fill="none" stroke="currentColor" strokeWidth="2" />
                        <circle cx="10" cy="10" r="3" fill="currentColor" />
                      </svg>
                    </span>
                  )}
                  {(isSource || isSource2) && <span className={styles.sourceGlyph} aria-hidden="true" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
