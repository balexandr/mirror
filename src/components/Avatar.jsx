// Preset avatar set — see PROFILE_DESIGN.md. Meant to be the same
// shape in every game that shows an all-time leaderboard, same
// convention as shareAll.js/leaderboard.js: copied byte-for-byte, kept
// in sync, never diverges per-game. The known-good id list lives here,
// not in the database (set_avatar only checks shape) — adding a 13th
// avatar later is a client-only change, no migration.
const ICONS = {
  fox: { color: '#f97316', path: (
    <>
      <path d="M12 3 5 9v5l3 5h8l3-5V9z" />
      <path d="M5 9 2 4l5 1.5M19 9l3-5-5 1.5" />
      <circle cx="9.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 15.5 10.5 17h3z" />
    </>
  ) },
  owl: { color: '#8b5cf6', path: (
    <>
      <path d="M12 3c-4.5 0-7 3-7 7.5S7.5 21 12 21s7-6 7-10.5S16.5 3 12 3Z" />
      <circle cx="9" cy="11" r="2" />
      <circle cx="15" cy="11" r="2" />
      <circle cx="9" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <circle cx="15" cy="11" r="0.6" fill="currentColor" stroke="none" />
      <path d="M12 12.5 11 15h2z" />
    </>
  ) },
  cat: { color: '#ec4899', path: (
    <>
      <path d="M5 4 9 9h6l4-5-1 7a6 6 0 0 1-12 0Z" />
      <circle cx="9.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="12.5" r="0.8" fill="currentColor" stroke="none" />
      <path d="M9 16c1 1 5 1 6 0" />
      <path d="M4 14h3M4 16.5h3M17 14h3M17 16.5h3" />
    </>
  ) },
  robot: { color: '#06b6d4', path: (
    <>
      <rect x="5" y="8" width="14" height="11" rx="2.5" />
      <path d="M12 8V5M9.5 5h5" />
      <circle cx="9.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="1.1" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </>
  ) },
  ghost: { color: '#a5b4fc', path: (
    <>
      <path d="M6 20V11a6 6 0 0 1 12 0v9l-2.5-2-2 2-1.5-1.5-1.5 1.5-2-2Z" />
      <circle cx="9.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="11.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ) },
  rocket: { color: '#ef4444', path: (
    <>
      <path d="M12 2c3 2 4.5 6 4.5 10 0 2-1 4-1 4h-7s-1-2-1-4C7.5 8 9 4 12 2Z" />
      <circle cx="12" cy="10" r="1.6" />
      <path d="M8 15l-2.5 3M16 15l2.5 3M10 18.5h4l-1 2.5h-2z" />
    </>
  ) },
  star: { color: '#eab308', path: (
    <path d="m12 3 2.6 5.6 6.1.7-4.6 4.2 1.3 6-5.4-3-5.4 3 1.3-6-4.6-4.2 6.1-.7Z" />
  ) },
  bolt: { color: '#f59e0b', path: (
    <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" />
  ) },
  wave: { color: '#3b82f6', path: (
    <>
      <path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </>
  ) },
  diamond: { color: '#14b8a6', path: (
    <path d="M12 2 4 9l8 13 8-13Zm-5.5 7h11M9 9l-1.5-5M15 9l1.5-5M9 9l3 6 3-6" />
  ) },
  moon: { color: '#6366f1', path: (
    <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 7 7 0 0 0 20 14.5Z" />
  ) },
  sun: { color: '#fb923c', path: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v3M12 18.5v3M3.8 5.8l2.1 2.1M18.1 16.1l2.1 2.1M2.5 12h3M18.5 12h3M3.8 18.2l2.1-2.1M18.1 7.9l2.1-2.1" />
    </>
  ) },
}

export const AVATAR_IDS = Object.keys(ICONS)

export function Avatar({ id = 'default', size = 28 }) {
  const icon = ICONS[id]
  if (!icon) {
    return (
      <div
        style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--surface, #e5e7eb)', flexShrink: 0,
        }}
        aria-hidden="true"
      />
    )
  }
  return (
    <div
      style={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `${icon.color}26`, color: icon.color,
      }}
      aria-hidden="true"
    >
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icon.path}
      </svg>
    </div>
  )
}
