export function GameLogo() {
  const C = '#6366f1';
  const BEAM = '#a5b4fc';

  return (
    <svg viewBox="0 0 48 48" width="26" height="26" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* Mirror shard — a faceted diamond */}
      <path
        d="M 24 4 L 44 24 L 24 44 L 4 24 Z"
        fill="none" stroke={C} strokeWidth="4" strokeLinejoin="round"
      />
      {/* Light beam bouncing through it */}
      <path
        d="M 12 27 L 20 17 L 26 32 L 36 15"
        fill="none" stroke={BEAM} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
