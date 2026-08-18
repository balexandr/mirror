import { useState, useCallback, useEffect, useMemo } from 'react';
import puzzles from '../data/puzzles.js';
import { simulateBeam, mirrorCount, cycleOrientation, findSolution } from '../utils/beam.js';

const STORAGE_KEY = 'mirror-game-state';
const EPOCH = '2026-08-17';
export const MAX_FIRES = 5;

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

// Stars reward planning, not fiddling: fewer *fires* to a solve, not fewer
// mirrors. Mirror-count par is still shown as a bonus stat in the result
// screen, but it no longer gates the rating — the thing that's actually
// hard now is committing to a beam blind and getting it right early.
function starsForFires(fires) {
  if (fires <= 2) return 3;
  if (fires === 3) return 2;
  return 1; // 4 or 5
}

// A cheap content fingerprint for a puzzle — not cryptographic, just enough
// to detect "this isn't the same puzzle anymore" if a day's puzzle is ever
// edited after someone has already played it (bit us once already: today's
// puzzle changed shape three times under the same date key, and a stale
// "won" save from an earlier version silently locked every slot in the
// new one, with no visible error — it just looked dead).
function fingerprint(puzzle) {
  return JSON.stringify({
    size: puzzle.size,
    source: puzzle.source,
    target: puzzle.target,
    fixed: puzzle.fixed,
    slots: puzzle.slots,
    par: puzzle.par,
  });
}

function loadState(dateKey, puzzle) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    if (saved.dateKey !== dateKey) return null;
    if (saved.puzzleFingerprint !== fingerprint(puzzle)) return null;
    return saved;
  } catch { return null; }
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

export function useGameState() {
  const dateKey = getTodayKey();
  const puzzle = puzzles[dateKey] || null;
  const puzzleNumber = Math.floor((new Date(dateKey) - new Date(EPOCH)) / 86400000) + 1;

  // Mirrors the player is currently arranging — always visible, edited
  // freely, and NOT what determines the beam trace shown on screen.
  const [mirrors, setMirrors] = useState({});
  // The mirror layout as of the last time "Fire Beam" was pressed — this,
  // not `mirrors`, is what the beam trace on screen is computed from. The
  // whole point of the hidden-beam mechanic: you don't get to see the
  // light react to every tap anymore, only to a committed shot.
  const [lastFiredMirrors, setLastFiredMirrors] = useState(null);
  const [firedCount, setFiredCount] = useState(0);
  const [firesUsedAtWin, setFiresUsedAtWin] = useState(0);
  const [mirrorsUsedAtWin, setMirrorsUsedAtWin] = useState(0);
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing' | 'won' | 'lost'
  const [initialized, setInitialized] = useState(false);
  const [poppedSlot, setPoppedSlot] = useState(null);

  useEffect(() => {
    if (!puzzle) { setInitialized(true); return; }
    const saved = loadState(dateKey, puzzle);
    if (saved) {
      setMirrors(saved.mirrors || {});
      setLastFiredMirrors(saved.lastFiredMirrors || null);
      setFiredCount(saved.firedCount || 0);
      setFiresUsedAtWin(saved.firesUsedAtWin || 0);
      setMirrorsUsedAtWin(saved.mirrorsUsedAtWin || 0);
      setGameStatus(saved.gameStatus || 'playing');
    }
    setInitialized(true);
  }, [dateKey]);

  useEffect(() => {
    if (!initialized || !puzzle) return;
    saveState({
      dateKey,
      puzzleFingerprint: fingerprint(puzzle),
      mirrors,
      lastFiredMirrors,
      firedCount,
      firesUsedAtWin,
      mirrorsUsedAtWin,
      gameStatus,
    });
  }, [mirrors, lastFiredMirrors, firedCount, firesUsedAtWin, mirrorsUsedAtWin, gameStatus, initialized]);

  // The trace of the last committed shot — null before any fire, so the
  // grid genuinely shows nothing until the player commits.
  const lastFiredBeam = useMemo(() => {
    if (!puzzle || !lastFiredMirrors) return null;
    return simulateBeam(puzzle, lastFiredMirrors);
  }, [puzzle, lastFiredMirrors]);

  // Only computed on a loss, and only ever for the reveal screen — cheap
  // brute force, see findSolution's own comment for why this isn't
  // pre-baked into puzzle data.
  const solution = useMemo(() => {
    if (!puzzle || gameStatus !== 'lost') return null;
    return findSolution(puzzle);
  }, [puzzle, gameStatus]);

  const solutionBeam = useMemo(() => {
    if (!puzzle || !solution) return null;
    return simulateBeam(puzzle, solution);
  }, [puzzle, solution]);

  const toggleSlot = useCallback((row, col) => {
    if (!puzzle || gameStatus !== 'playing') return;
    const key = `${row},${col}`;
    setMirrors((prev) => {
      const next = { ...prev };
      const nextOrientation = cycleOrientation(prev[key]);
      if (nextOrientation) next[key] = nextOrientation;
      else delete next[key];
      return next;
    });
    setPoppedSlot(key);
    setTimeout(() => setPoppedSlot(null), 200);
  }, [puzzle, gameStatus]);

  const fireBeam = useCallback(() => {
    if (!puzzle || gameStatus !== 'playing') return;
    const snapshot = { ...mirrors };
    const result = simulateBeam(puzzle, snapshot).result;
    const newFiredCount = firedCount + 1;
    setLastFiredMirrors(snapshot);
    setFiredCount(newFiredCount);
    if (result === 'win') {
      setGameStatus('won');
      setMirrorsUsedAtWin(mirrorCount(snapshot));
      setFiresUsedAtWin(newFiredCount);
    } else if (newFiredCount >= MAX_FIRES) {
      setGameStatus('lost');
    }
  }, [puzzle, gameStatus, mirrors, firedCount]);

  const reset = useCallback(() => {
    if (gameStatus !== 'playing') return;
    setMirrors({});
  }, [gameStatus]);

  const stars = gameStatus === 'won' ? starsForFires(firesUsedAtWin) : 0;
  const firesRemaining = MAX_FIRES - firedCount;

  const generateShareText = useCallback(() => {
    if (!puzzle || gameStatus === 'playing') return '';
    if (gameStatus === 'lost') {
      return `Mirror #${puzzleNumber} 🔦 X/${MAX_FIRES}\nnoodlegames.co`;
    }
    const bulbs = '💡'.repeat(stars) + '⚫'.repeat(3 - stars);
    return `Mirror #${puzzleNumber} 🔦 ${firesUsedAtWin}/${MAX_FIRES} ${bulbs}\nnoodlegames.co`;
  }, [puzzle, gameStatus, stars, firesUsedAtWin, puzzleNumber]);

  return {
    puzzle,
    puzzleNumber,
    dateKey,
    mirrors,
    lastFiredBeam,
    solution,
    solutionBeam,
    gameStatus,
    initialized,
    firedCount,
    firesRemaining,
    maxFires: MAX_FIRES,
    firesUsedAtWin,
    mirrorsUsedAtWin,
    stars,
    poppedSlot,
    toggleSlot,
    fireBeam,
    reset,
    generateShareText,
    currentMirrorCount: mirrorCount(mirrors),
  };
}
