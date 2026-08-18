import styles from './HowToPlay.module.css';

export default function HowToPlay({ onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">✕</button>
        <h2 className={styles.title}>How to Play</h2>

        <p className={styles.intro}>
          A beam of light enters the grid. Tap the dashed cells to place
          mirrors — but the beam stays hidden until you commit to it.
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
          <li>Plan your mirrors, then press <strong>Fire Beam</strong> to see where the light actually goes</li>
          <li>A fired shot leaves a dim trace so you can adjust and fire again</li>
          <li>5 fires per puzzle — like guesses. Run out, and it's a loss for the day</li>
          <li>Fewer fires to solve it = more stars</li>
          <li>Harder puzzles have <strong>multiple beams</strong> sharing the same mirrors — every one has to land</li>
          <li>A new puzzle every day</li>
        </ul>

        <div className={styles.legend}>
          <span>💡💡💡 Solved in 1–2 fires</span>
          <span>💡💡⚫ Solved in 3</span>
          <span>💡⚫⚫ Solved in 4–5</span>
        </div>

        <button className={styles.playBtn} onClick={onClose}>Got it — let's play</button>
      </div>
    </div>
  );
}
