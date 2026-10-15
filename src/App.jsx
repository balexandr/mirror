import { useState, useEffect } from 'react';
import { useGameState } from './hooks/useGameState';
import { useStats } from './hooks/useStats';
import MirrorGrid from './components/MirrorGrid';
import ResultScreen from './components/ResultScreen';
import HowToPlay from './components/HowToPlay';
import StatsScreen from './components/StatsScreen';
import LeaderboardPanel from './components/LeaderboardPanel';
import styles from './App.module.css';
import { NoodleLogoIcon } from './components/NoodleLogo';
import { GameLogo } from './components/GameLogo';
import { recordTodayShare, getCompletedTodayCount, shareAllCompleted, TOTAL_GAMES } from './utils/shareAll';
import { toLeaderboardScore } from './utils/leaderboardScore';
import { fetchTodayBoard, findMyRow, wouldQualify } from './utils/leaderboard';
import { getCurrentUser } from './lib/auth';
import { supabase } from './lib/supabase';
import { IconCheckmark, IconShare, IconFlashlight, IconLeaderboard } from './components/Icons';

const HOW_TO_PLAY_KEY = 'mirror-how-to-play-seen';

export default function App() {
  const {
    puzzle,
    puzzleNumber,
    dateKey,
    mirrors,
    lastFiredBeams,
    solution,
    solutionBeams,
    beamCount,
    beamWord,
    fireId,
    gameStatus,
    initialized,
    firedCount,
    firesRemaining,
    maxFires,
    firesUsedAtWin,
    mirrorsUsedAtWin,
    elapsedSecondsAtWin,
    stars,
    poppedSlot,
    toggleSlot,
    fireBeam,
    reset,
    generateShareText,
    currentMirrorCount,
  } = useGameState();

  const { stats, winPct, avgStars, recordGame } = useStats();

  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [shareAllCount, setShareAllCount] = useState(0);
  const [shareAllCopied, setShareAllCopied] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    try {
      if (!localStorage.getItem(HOW_TO_PLAY_KEY)) setShowHowToPlay(true);
    } catch {}
  }, []);

  const dismissHowToPlay = () => {
    setShowHowToPlay(false);
    try { localStorage.setItem(HOW_TO_PLAY_KEY, '1'); } catch {}
  };

  useEffect(() => {
    if (gameStatus === 'won' || gameStatus === 'lost') {
      recordGame(dateKey, gameStatus, stars);
      recordTodayShare('mirror', dateKey, generateShareText());
      // Fire-and-forget profile history — see PROFILE_DESIGN.md.
      // record_game_history no-ops server-side for a signed-out
      // player, so this never needs to special-case that here; never
      // awaited in a way that could delay the win/loss reveal below.
      getCurrentUser().then((user) => {
        if (!user || !supabase) return;
        const scoreDisplay = gameStatus === 'won'
          ? toLeaderboardScore(firesUsedAtWin || firedCount, elapsedSecondsAtWin).scoreDisplay
          : `Out of ${maxFires} fires`;
        supabase.rpc('record_game_history', {
          p_game_id: 'mirror',
          p_outcome: gameStatus,
          p_score_display: scoreDisplay,
        }).then(() => {}, () => {});
      });
      const t = setTimeout(() => setShowResult(true), 500);
      return () => clearTimeout(t);
    }
  }, [gameStatus]);

  // Auto-opens the leaderboard (initials prompt included) a beat after
  // a qualifying win, instead of making the player click "today's
  // leaderboard" to find out they made the cut.
  useEffect(() => {
    if (gameStatus !== 'won') return;
    const t = setTimeout(() => {
      const pending = toLeaderboardScore(firesUsedAtWin || firedCount, elapsedSecondsAtWin);
      fetchTodayBoard('mirror', dateKey).then((board) => {
        if (!board.config) return;
        if (findMyRow('mirror', board.rows)) return;
        if (wouldQualify(pending.score, board.rows, board.config)) {
          setShowLeaderboard(true);
        }
      });
    }, 2000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStatus]);

  useEffect(() => {
    setShareAllCount(getCompletedTodayCount(dateKey));
  }, [gameStatus, dateKey]);

  const handleShareAll = async () => {
    const outcome = await shareAllCompleted(dateKey);
    if (outcome !== 'copied') return;
    setShareAllCopied(true);
    setTimeout(() => setShareAllCopied(false), 2500);
  };

  const footer = (
    <footer className={styles.footer}>
      <a href="https://noodlegames.co" target="_blank" rel="noopener noreferrer" className={styles.footerLogo}>
        <NoodleLogoIcon size={18} /> NoodleGames
      </a>
      {shareAllCount > 0 && (
        <button
          className={`${styles.footerShareAll} ${shareAllCopied ? styles.copied : ''}`}
          onClick={handleShareAll}
        >
          {shareAllCopied
            ? <><IconCheckmark size={13} /> Copied</>
            : <><IconShare size={13} /> Share all completed ({shareAllCount}/{TOTAL_GAMES})</>}
        </button>
      )}
      <a href="https://noodlegames.co/privacy" target="_blank" rel="noopener noreferrer" className={styles.footerPrivacy}>Privacy Policy</a>
      <span className={styles.footerCopy}>© {currentYear} NoodleGames.co</span>
    </footer>
  );

  const Logo = () => (
    <h1 className={styles.logo}>
      <GameLogo />
      <span className={styles.logoMirror}>Mirror</span>
    </h1>
  );

  if (!initialized) return null;

  if (!puzzle) {
    return (
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.headerLeft}><Logo /></div>
        </header>
        <div className={styles.noPuzzle}>
          <p>No puzzle for today yet.</p>
          <p className={styles.muted}>Check back tomorrow!</p>
        </div>
        {footer}
      </div>
    );
  }

  const interactive = gameStatus === 'playing';
  // What the grid actually renders: your own placement while playing, the
  // revealed solution's layout on a loss (the ghost trace + your own final,
  // wrong guess isn't nearly as useful as just showing the answer).
  const displayMirrors = gameStatus === 'lost' && solution ? solution : mirrors;
  const beamStyle = gameStatus === 'won' ? 'win' : gameStatus === 'lost' ? 'lost' : 'ghost';
  const displayBeams = gameStatus === 'lost' && solutionBeams ? solutionBeams : lastFiredBeams;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <Logo />
          {puzzleNumber > 0 && <span className={styles.puzzleNumber}>#{puzzleNumber}</span>}
        </div>
        <div className={styles.headerRight}>
          <button className={styles.iconButton} onClick={() => setShowLeaderboard(true)} aria-label="Leaderboard">
            <IconLeaderboard size={20} />
          </button>
          <button className={styles.iconButton} onClick={() => setShowStats(true)} aria-label="Statistics">
            <svg className={styles.statsIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M4 20H20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <rect x="6" y="11" width="2.8" height="7" rx="1" fill="currentColor" />
              <rect x="10.6" y="7" width="2.8" height="11" rx="1" fill="currentColor" opacity="0.9" />
              <rect x="15.2" y="4" width="2.8" height="14" rx="1" fill="currentColor" opacity="0.8" />
            </svg>
          </button>
          <button className={styles.iconButton} onClick={() => setShowHowToPlay(true)} aria-label="How to play">?</button>
        </div>
      </header>

      <main className={styles.main}>
        <p className={styles.prompt}>
          {gameStatus === 'lost' ? `Out of fires, here's the solution` : `Plan your shot, then fire the ${beamWord}`}
        </p>
        {interactive && <p className={styles.hint}>Tap the glowing dashed cells to place mirrors</p>}

        <MirrorGrid
          puzzle={puzzle}
          mirrors={displayMirrors}
          beams={displayBeams}
          beamStyle={beamStyle}
          fireId={fireId}
          interactive={interactive}
          poppedSlot={poppedSlot}
          onToggleSlot={toggleSlot}
        />
        {beamCount > 1 && interactive && (
          <p className={styles.twoBeamNote}>
            {beamCount} beams share these mirrors, all {beamCount} must land
          </p>
        )}

        <div className={styles.hud}>
          <span className={styles.hudCount}>
            {currentMirrorCount} mirror{currentMirrorCount === 1 ? '' : 's'} placed
          </span>
          {interactive && currentMirrorCount > 0 && (
            <button className={styles.resetBtn} onClick={reset}>Reset</button>
          )}
        </div>

        {interactive && (
          <button className={styles.fireBtn} onClick={fireBeam}>
            <IconFlashlight size={16} /> Fire {beamCount > 1 ? 'Beams' : 'Beam'}
            <span className={styles.fireCount}>{firesRemaining}/{maxFires} left</span>
          </button>
        )}
        {!interactive && (
          <p className={styles.firesSpent}>
            {gameStatus === 'won'
              ? `Solved in ${firesUsedAtWin}/${maxFires} fires`
              : `Used all ${maxFires} fires`}
          </p>
        )}

        {(gameStatus === 'won' || gameStatus === 'lost') && !showResult && (
          <button className={styles.showResultBtn} onClick={() => setShowResult(true)}>
            See results
          </button>
        )}
      </main>

      {showResult && (
        <ResultScreen
          puzzle={puzzle}
          puzzleNumber={puzzleNumber}
          outcome={gameStatus}
          stars={stars}
          firesUsed={firesUsedAtWin || firedCount}
          maxFires={maxFires}
          mirrorsUsed={mirrorsUsedAtWin}
          generateShareText={generateShareText}
          stats={stats}
          winPct={winPct}
          avgStars={avgStars}
          onDismiss={() => setShowResult(false)}
          onViewLeaderboard={() => setShowLeaderboard(true)}
        />
      )}

      {showLeaderboard && (
        <LeaderboardPanel
          dateKey={dateKey}
          pendingScore={gameStatus === 'won' ? toLeaderboardScore(firesUsedAtWin || firedCount, elapsedSecondsAtWin) : null}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {showHowToPlay && <HowToPlay onClose={dismissHowToPlay} />}
      {showStats && <StatsScreen stats={stats} winPct={winPct} avgStars={avgStars} onClose={() => setShowStats(false)} />}

      {footer}
    </div>
  );
}
