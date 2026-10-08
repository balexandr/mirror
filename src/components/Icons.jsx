// Small line-art icon set replacing emoji in Mirror's UI. Matches the
// 24x24 viewBox / stroke / currentColor style the rest of the suite
// uses. Share text is NOT touched by this: generateShareText() in
// useGameState.js builds the actual shared result string (🔦 header +
// 💡⚫ bulbs), plain text sent via SMS/clipboard, a custom icon can't
// survive that trip, so it stays real Unicode there. The "×" in
// MirrorGrid.jsx's comment ("2×--board-pad wider") is dimension
// notation, not a UI icon, also left alone.
function base(props) {
  return { viewBox: '0 0 24 24', fill: 'none', xmlns: 'http://www.w3.org/2000/svg', 'aria-hidden': true, ...props };
}

export function IconClose({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M5 5l14 14M19 5L5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconCheckmark({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M5 12.5l4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconShare({ size = 16, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M12 15V4M12 4l-3.5 3.5M12 4l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconFlashlight({ size = 20, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M9 3h5l1.5 2.5h-8L9 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="7.5" y="5.5" width="9" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8 12l-1.5 7a1 1 0 0 0 1 1.2h9a1 1 0 0 0 1-1.2L16 12Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M19 7l2.5-1M19 9.5h2.8M19 12l2.5 1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

// A single fire-slot indicator, lit (used a fire, found a star) or
// unlit (fire still in reserve).
export function IconBulbState({ lit, size = 18, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M12 3a6.5 6.5 0 0 0-3.8 11.8c.6.45 1 1.17 1 1.95V18h5.6v-1.25c0-.78.4-1.5 1-1.95A6.5 6.5 0 0 0 12 3Z"
        fill={lit ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" opacity={lit ? 1 : 0.45} />
      <path d="M9.6 21h4.8M10.2 18.6h3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" opacity={lit ? 1 : 0.45} />
    </svg>
  );
}

export function IconSparkle({ size = 40, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M12 3l1.4 5.6L19 10l-5.6 1.4L12 17l-1.4-5.6L5 10l5.6-1.4L12 3Z" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M19 15l.6 2.4L22 18l-2.4.6L19 21l-.6-2.4L16 18l2.4-.6L19 15Z" fill="currentColor" />
    </svg>
  );
}

// "Out of fires" loss state: a small burst/shatter shape.
export function IconBurst({ size = 40, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path d="M12 2l1.3 5.6L18 4l-2.3 5.3L21 11l-5.4 1.2L18 18l-5-2.8L12 22l-1-6.8-5 2.8 2.4-5.8L3 11l5.3-1.7L6 4l4.7 3.6L12 2Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function IconStar({ size = 14, filled = true, ...props }) {
  return (
    <svg width={size} height={size} {...base(props)}>
      <path
        d="M12 3.2l2.6 5.4 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.2Z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
