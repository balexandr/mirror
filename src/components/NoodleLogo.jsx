export function NoodleLogoIcon({ size = 28 }) {
  return (
    <svg viewBox="0 0 36 36" width={size} height={size} aria-hidden="true" style={{ flexShrink: 0 }}>
      <line x1="10" y1="2" x2="19" y2="22" stroke="#ff6b35" strokeWidth="2.8" strokeLinecap="round" />
      <line x1="26" y1="2" x2="17" y2="22" stroke="#ff6b35" strokeWidth="2.8" strokeLinecap="round" />
      <circle cx="18" cy="11" r="2.2" fill="#ffc947" />
      <path d="M 5 20 Q 18 34 31 20" fill="none" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="5" y1="20" x2="31" y2="20" stroke="#ff6b35" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
      <path
        d="M 9 22.5 Q 12 18.5 15 22.5 Q 18 26.5 21 22.5 Q 24 18.5 27 22.5"
        fill="none" stroke="#ffc947" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}
