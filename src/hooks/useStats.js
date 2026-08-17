import { useState, useCallback } from 'react';

const STATS_KEY = 'mirror-stats';

function getDefaultStats() {
  return {
    gamesPlayed: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: { 1: 0, 2: 0, 3: 0 },
    lastCompletedDate: null,
  };
}

function loadStats() {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    if (!raw) return getDefaultStats();
    const parsed = JSON.parse(raw);
    return { ...getDefaultStats(), ...parsed, distribution: { ...getDefaultStats().distribution, ...parsed.distribution } };
  } catch { return getDefaultStats(); }
}

function saveStats(stats) {
  try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
}

function isConsecutiveDay(dateA, dateB) {
  if (!dateA || !dateB) return false;
  const diff = Math.abs(new Date(dateB) - new Date(dateA));
  return diff >= 86400000 && diff < 172800000;
}

export function useStats() {
  const [stats, setStats] = useState(loadStats);

  const recordGame = useCallback((dateKey, stars) => {
    setStats((prev) => {
      if (prev.lastCompletedDate === dateKey) return prev;
      const next = { ...prev, distribution: { ...prev.distribution } };
      next.gamesPlayed += 1;
      next.distribution[stars] = (next.distribution[stars] || 0) + 1;

      if (isConsecutiveDay(prev.lastCompletedDate, dateKey) || prev.gamesPlayed === 0) {
        next.currentStreak = prev.currentStreak + 1;
      } else {
        next.currentStreak = 1;
      }
      next.maxStreak = Math.max(next.maxStreak, next.currentStreak);
      next.lastCompletedDate = dateKey;

      saveStats(next);
      return next;
    });
  }, []);

  const avgStars = stats.gamesPlayed > 0
    ? ((stats.distribution[1] * 1 + stats.distribution[2] * 2 + stats.distribution[3] * 3) / stats.gamesPlayed).toFixed(1)
    : '0.0';

  return { stats, avgStars, recordGame };
}
