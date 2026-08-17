import { useState, useCallback, useEffect, useMemo } from 'react';
import puzzles from '../data/puzzles.js';
import { simulateBeam, mirrorCount, cycleOrientation } from '../utils/beam.js';

const STORAGE_KEY = 'mirror-game-state';
const EPOCH = '2026-08-17';

function getTodayKey() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
}

function starsFor(used, par) {
  if (used <= par) return 3;
  if (used <= par + 2) return 2;
  return 1;
}

// A cheap content fingerprint for a puzzle — not cryptographic, just enough
// to detect "this isn't the same puzzle anymore" if a day's puzzle is ever
// edited after someone has already played it (which happened during tuning:
// today's puzzle changed shape three times under the same date key, and
// without this a stale "won" save from an earlier version silently locks
// every slot in the new one, with no visible error — it just looks dead).
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

  const [mirrors, setMirrors] = useState({});
  const [gameStatus, setGameStatus] = useState('playing'); // 'playing' | 'won'
  const [mirrorsUsedAtWin, setMirrorsUsedAtWin] = useState(0);
  const [initialized, setInitialized] = useState(false);
  const [poppedSlot, setPoppedSlot] = useState(null);

  useEffect(() => {
    if (!puzzle) { setInitialized(true); return; }
    const saved = loadState(dateKey, puzzle);
    if (saved) {
      setMirrors(saved.mirrors || {});
      setGameStatus(saved.gameStatus || 'playing');
      setMirrorsUsedAtWin(saved.mirrorsUsedAtWin || 0);
    }
    setInitialized(true);
  }, [dateKey]);

  useEffect(() => {
    if (!initialized || !puzzle) return;
    saveState({ dateKey, puzzleFingerprint: fingerprint(puzzle), mirrors, gameStatus, mirrorsUsedAtWin });
  }, [mirrors, gameStatus, mirrorsUsedAtWin, initialized]);

  const beam = useMemo(() => {
    if (!puzzle) return { cells: [], result: 'open' };
    return simulateBeam(puzzle, mirrors);
  }, [puzzle, mirrors]);

  const toggleSlot = useCallback((row, col) => {
    if (!puzzle || gameStatus === 'won') return;
    const key = `${row},${col}`;
    setMirrors((prev) => {
      const next = { ...prev };
      const nextOrientation = cycleOrientation(prev[key]);
      if (nextOrientation) next[key] = nextOrientation;
      else delete next[key];

      const result = simulateBeam(puzzle, next).result;
      if (result === 'win') {
        const used = mirrorCount(next);
        setGameStatus('won');
        setMirrorsUsedAtWin(used);
      }
      return next;
    });
    setPoppedSlot(key);
    setTimeout(() => setPoppedSlot(null), 200);
  }, [puzzle, gameStatus]);

  const reset = useCallback(() => {
    if (gameStatus === 'won') return;
    setMirrors({});
  }, [gameStatus]);

  const stars = gameStatus === 'won' ? starsFor(mirrorsUsedAtWin, puzzle?.par ?? 1) : 0;

  const generateShareText = useCallback(() => {
    if (!puzzle || gameStatus !== 'won') return '';
    const bulbs = '💡'.repeat(stars) + '⚫'.repeat(3 - stars);
    return `Mirror #${puzzleNumber} ${bulbs} (${mirrorsUsedAtWin}/${puzzle.par} mirrors)\nnoodlegames.co`;
  }, [puzzle, gameStatus, stars, mirrorsUsedAtWin, puzzleNumber]);

  return {
    puzzle,
    puzzleNumber,
    dateKey,
    mirrors,
    beam,
    gameStatus,
    initialized,
    mirrorsUsedAtWin,
    stars,
    poppedSlot,
    toggleSlot,
    reset,
    generateShareText,
    currentMirrorCount: mirrorCount(mirrors),
  };
}
