// Cross-game "Share All Completed" support.
// All NoodleGames sites are served from the same origin (balexandr.github.io),
// so localStorage written by one game is readable by every other game -
// this file (copied byte-for-byte into every game repo) is the shared contract.
// Kept in sync with the hub roster in noodle_games/src/data/games.js.
const GAMES = [
  { id: 'pathways', label: 'Pathways' },
  { id: 'sprout', label: 'Sprout' },
  { id: 'chainlink', label: 'Chain Link' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'knot', label: 'Knot' },
  { id: 'zeroin', label: 'Zero In' },
  { id: 'oddoneout', label: 'Odd One Out' },
  { id: 'mirror', label: 'Mirror' },
];

const KEY_PREFIX = 'noodle-share-';

// Call this the moment a game finishes, passing the exact text its own
// share button would produce - Share All just stitches these together
// verbatim, so results never drift from a game's individual share text.
export function recordTodayShare(gameId, dateKey, text) {
  if (!text) return;
  try {
    localStorage.setItem(`${KEY_PREFIX}${gameId}`, JSON.stringify({ date: dateKey, text }));
  } catch {}
}

function readTodayEntry(gameId, dateKey) {
  try {
    const raw = localStorage.getItem(`${KEY_PREFIX}${gameId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && parsed.date === dateKey && parsed.text ? parsed.text : null;
  } catch {
    return null;
  }
}

export function getCompletedTodayCount(dateKey) {
  return GAMES.reduce((count, { id }) => (readTodayEntry(id, dateKey) ? count + 1 : count), 0);
}

export function buildShareAllText(dateKey) {
  const entries = GAMES.map(({ id }) => readTodayEntry(id, dateKey)).filter(Boolean);
  if (entries.length === 0) return '';
  const header = `Noodle Games: ${entries.length}/${GAMES.length} solved today 🍜`;
  return [header, ...entries].join('\n\n');
}

export const TOTAL_GAMES = GAMES.length;
