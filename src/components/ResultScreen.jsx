import { useState, useEffect } from 'react';
import styles from './ResultScreen.module.css';

const HEADLINES = {
  3: 'Perfect beam!',
  2: 'Nice redirect!',
  1: 'Solved!',
};

export default function ResultScreen({
  puzzle,
  puzzleNumber,
  stars,
  mirrorsUsed,
  generateShareText,
  stats,
  avgStars,
  onDismiss,
}) {
  const [copied, setCopied] = useState(false);
  const shareText = generateShareText();

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 2500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: shareText });
        return;
      } catch {
        // cancelled or errored — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(shareText);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareText;
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
  };

  return (
    <div className={styles.overlay} onClick={onDismiss}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onDismiss} aria-label="Close">✕</button>

        <div className={styles.topSection}>
          <div className={styles.emoji}>{stars === 3 ? '✨' : stars === 2 ? '💡' : '🔦'}</div>
          <h2 className={styles.headline}>{HEADLINES[stars]}</h2>
          <p className={styles.puzzleNum}>Mirror #{puzzleNumber}</p>
        </div>

        <div className={styles.starsRow}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= stars ? styles.starOn : styles.starOff}>
              {n <= stars ? '💡' : '⚫'}
            </span>
          ))}
        </div>

        <p className={styles.mirrorLine}>
          Solved with <strong>{mirrorsUsed}</strong> mirror{mirrorsUsed === 1 ? '' : 's'}
          {' '}<span className={styles.par}>(par {puzzle.par})</span>
        </p>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.gamesPlayed}</span>
            <span className={styles.statLabel}>Solved</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{avgStars}</span>
            <span className={styles.statLabel}>Avg ★</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.currentStreak}</span>
            <span className={styles.statLabel}>Streak</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.maxStreak}</span>
            <span className={styles.statLabel}>Best</span>
          </div>
        </div>

        <div className={styles.sharePreview}>
          <p className={styles.sharePreviewLabel}>Share text</p>
          <div className={styles.sharePreviewBox}>
            {shareText.split('\n').map((line, i) => (
              <span key={i} className={styles.sharePreviewLine}>{line}</span>
            ))}
          </div>
        </div>

        <button className={`${styles.shareBtn} ${copied ? styles.copied : ''}`} onClick={handleShare}>
          {copied ? '✓ Copied to clipboard' : '⬆ Share'}
        </button>
      </div>
    </div>
  );
}
