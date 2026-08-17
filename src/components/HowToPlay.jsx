import styles from './HowToPlay.module.css';

export default function HowToPlay({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        <h2 className={styles.title}>How to Play</h2>

        <p className={styles.intro}>
          A beam of light enters the grid. Tap the dashed cells to place
          mirrors and bend the beam until it hits the target.
        </p>

        <div className={styles.example}>
          <div className={styles.exRow}>
            <span className={styles.exCell}>
              <svg viewBox="0 0 20 20" width="18" height="18"><line x1="3" y1="17" x2="17" y2="3" stroke="#c7d2fe" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </span>
            <span className={styles.exLabel}>Tap once — mirror set to "/"</span>
          </div>
          <div className={styles.exRow}>
            <span className={styles.exCell}>
              <svg viewBox="0 0 20 20" width="18" height="18"><line x1="3" y1="3" x2="17" y2="17" stroke="#c7d2fe" strokeWidth="2.6" strokeLinecap="round" /></svg>
            </span>
            <span className={styles.exLabel}>Tap again — mirror set to "\"</span>
          </div>
          <div className={styles.exRow}>
            <span className={styles.exCell}>·</span>
            <span className={styles.exLabel}>Tap a third time — cell clears</span>
          </div>
        </div>

        <ul className={styles.rules}>
          <li>The beam re-routes live — no submit button</li>
          <li>Reach the target in as few mirrors as possible</li>
          <li>No wrong answers, no fail state — just optimize your score</li>
          <li>3 stars at par, 2 for a couple over, 1 for any solve</li>
          <li>A new puzzle every day</li>
        </ul>

        <div className={styles.legend}>
          <span>💡💡💡 At or under par</span>
          <span>💡💡⚫ A little over</span>
          <span>💡⚫⚫ Solved, well over</span>
        </div>

        <button className={styles.playBtn} onClick={onClose}>Got it — let's play</button>
      </div>
    </div>
  );
}
