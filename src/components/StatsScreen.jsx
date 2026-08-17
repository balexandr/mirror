import styles from './StatsScreen.module.css';

export default function StatsScreen({ stats, avgStars, onClose }) {
  const maxDist = Math.max(...Object.values(stats.distribution), 1);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        <h2 className={styles.title}>Statistics</h2>

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

        <h3 className={styles.distTitle}>Star Ratings</h3>
        <div className={styles.distribution}>
          {[3, 2, 1].map((n) => {
            const count = stats.distribution[n] || 0;
            const pct = Math.round((count / maxDist) * 100);
            return (
              <div key={n} className={styles.distRow}>
                <span className={styles.distLabel}>{'★'.repeat(n)}</span>
                <div className={styles.barTrack}>
                  <div
                    className={styles.bar}
                    style={{ width: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                  >
                    <span className={styles.barCount}>{count}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
