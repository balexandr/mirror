// Cross-game "Share All Completed" support.
//
// Every NoodleGames site now lives on its own noodlegames.co subdomain
// (mirror.noodlegames.co, knot.noodlegames.co, etc.) rather than one shared
// balexandr.github.io origin. Different subdomains are different origins,
// and localStorage is strictly origin-scoped - it can no longer carry a
// "which games did you finish today" record between them the way it used
// to (that's why this showed 1/8 instead of 8/8 after the domain move: each
// game could only ever see its own entry). Cookies scoped to the parent
// domain (Domain=.noodlegames.co) ARE shared across every subdomain, so
// this now stores through those instead. Same external API as before -
// nothing calling into this file needs to change.
//
// This file is copied byte-for-byte into every game repo. Kept in sync
// with the hub roster in noodle_games/src/data/games.js.
const GAMES = [
  { id: 'pathways', label: 'Pathways' },
  { id: 'sprout', label: 'Sprout' },
  { id: 'chainlink', label: 'Chain Link' },
  { id: 'sequence', label: 'Sequence' },
  { id: 'knot', label: 'Knot' },
  { id: 'zeroin', label: 'Zero In' },
  { id: 'oddoneout', label: 'Odd One Out' },
  { id: 'mirror', label: 'Mirror' },
  { id: 'realm', label: 'Realm' },
  { id: 'tandem', label: 'Tandem' },
  { id: 'dial', label: 'Dial' },
  { id: 'weave', label: 'Weave' },
];

const KEY_PREFIX = 'noodle-share-';
const COOKIE_DOMAIN = '.noodlegames.co';

// The scoped domain + Secure attribute only make sense on an actual
// noodlegames.co subdomain over HTTPS - a localhost/preview host can't set
// a cookie for an unrelated domain, and Secure cookies are rejected outright
// over plain http. Falls back to a same-origin, non-Secure cookie anywhere
// else so local dev can actually see the Share All button, instead of it
// silently never appearing.
function onProdDomain() {
  try {
    return window.location.hostname.endsWith('.noodlegames.co');
  } catch {
    return false;
  }
}

function setSharedCookie(name, value) {
  try {
    const maxAge = 2 * 24 * 60 * 60; // 2 days is plenty to cover "today" everywhere
    const prod = onProdDomain();
    const domainPart = prod ? `domain=${COOKIE_DOMAIN}; ` : '';
    const securePart = prod ? 'Secure; ' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; ${domainPart}path=/; max-age=${maxAge}; SameSite=Lax; ${securePart}`;
  } catch {}
}

function getSharedCookie(name) {
  try {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp('(?:^|; )' + escaped + '=([^;]*)'));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

// Call this the moment a game finishes, passing the exact text its own
// share button would produce - Share All just stitches these together
// verbatim, so results never drift from a game's individual share text.
export function recordTodayShare(gameId, dateKey, text) {
  if (!text) return;
  setSharedCookie(`${KEY_PREFIX}${gameId}`, JSON.stringify({ date: dateKey, text }));
}

function readTodayEntry(gameId, dateKey) {
  try {
    const raw = getSharedCookie(`${KEY_PREFIX}${gameId}`);
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
