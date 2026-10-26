import { useState, useEffect, useCallback } from 'react';
import { fetchTodayBoard, submitScore, wouldQualify, findMyRow, LEADERBOARD_SIZE, getSavedInitials, saveInitials } from '../utils/leaderboard';
import { IconClose, IconTrophy } from './Icons';
import styles from './LeaderboardPanel.module.css';

const GAME_ID = 'mirror';

// pendingScore is null when opened just to browse ("View leaderboard" in
// the header); it's { score, tiebreak, scoreDisplay } when opened right
// after a win, in which case this also offers the initials prompt if the
// score currently qualifies for today's top LEADERBOARD_SIZE.
export default function LeaderboardPanel({ dateKey, pendingScore, onClose }) {
  const [board, setBoard] = useState(null);
  const [initials, setInitials] = useState(() => getSavedInitials());
  const [savedInitials, setSavedInitials] = useState(() => getSavedInitials());
  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState(null); // null | 'accepted' | 'missed'

  const reload = useCallback(() => {
    fetchTodayBoard(GAME_ID, dateKey).then(setBoard);
  }, [dateKey]);

  useEffect(() => { reload(); }, [reload]);

  const myRow = board && findMyRow(GAME_ID, board.rows);

  // Already on today's board? Never re-prompt for initials, even if
  // the board still has fewer than LEADERBOARD_SIZE entries (that alone doesn't
  // mean YOU haven't already claimed your spot).
  const qualifies = board && pendingScore && !outcome && !myRow
    && wouldQualify(pendingScore.score, board.rows, board.config);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (initials.length < 2 || submitting) return;
    setSubmitting(true);
    const result = await submitScore(GAME_ID, { ...pendingScore, initials });
    setSubmitting(false);
    if (result.error) {
      console.error('submitScore failed:', result.error);
      setOutcome('error');
    } else {
      setOutcome(result.accepted ? 'accepted' : 'missed');
    }
    if (result.accepted) {
      saveInitials(initials);
      setSavedInitials(initials);
      reload();
    }
  };

  // Not tied to a score submission — just changes what prefills next
  // time, so a player who's already on the board (or never qualifies
  // again) still has a way to fix a mistyped set of initials.
  const handleEditSave = (e) => {
    e.preventDefault();
    if (initials.length < 2) return;
    saveInitials(initials);
    setSavedInitials(initials);
    setEditing(false);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.titleIcon}><IconTrophy size={24} /></span>
          <h2 className={styles.title}>Mirror Leaderboard</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close"><IconClose /></button>
        </div>

        {editing && (
          <form className={styles.initialsForm} onSubmit={handleEditSave}>
            <p className={styles.prompt}>Change your initials (2-3 letters):</p>
            <input
              className={styles.initialsInput}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
              maxLength={3}
              autoFocus
              aria-label="Your initials"
            />
            <div className={styles.editActions}>
              <button type="submit" className={styles.submitBtn} disabled={initials.length < 2}>Save</button>
              <button type="button" className={styles.cancelBtn} onClick={() => { setInitials(savedInitials); setEditing(false); }}>Cancel</button>
            </div>
          </form>
        )}

        {!editing && qualifies && (
          <form className={styles.initialsForm} onSubmit={handleSubmit}>
            <p className={styles.prompt}>Top {LEADERBOARD_SIZE}! Enter your initials (2-3 letters):</p>
            <input
              className={styles.initialsInput}
              value={initials}
              onChange={(e) => setInitials(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
              maxLength={3}
              autoFocus
              aria-label="Your initials"
            />
            <button type="submit" className={styles.submitBtn} disabled={initials.length < 2 || submitting}>
              {submitting ? 'Saving…' : 'Submit'}
            </button>
          </form>
        )}

        {!editing && !qualifies && savedInitials && (
          <div className={styles.playingAs}>
            <span>Playing as <strong>{savedInitials}</strong></span>
            <button type="button" className={styles.editLink} onClick={() => setEditing(true)}>edit</button>
          </div>
        )}

        {outcome === 'missed' && (
          <p className={styles.outcomeMissed}>Someone beat you to that spot just now, so close.</p>
        )}

        {outcome === 'error' && (
          <p className={styles.outcomeMissed}>Couldn't save your score — try again in a bit.</p>
        )}

        {!board && <p className={styles.loading}>Loading…</p>}

        {board && (
          <ol className={styles.list}>
            {board.rows.length === 0 && <li className={styles.empty}>No scores yet today. Be the first.</li>}
            {board.rows.map((row, i) => (
              <li key={`${row.initials}-${i}`} className={`${styles.row} ${row === myRow ? styles.rowMine : ''}`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.initials}>{row.initials}</span>
                <span className={styles.score}>{row.score_display}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
