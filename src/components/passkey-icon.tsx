/** A simple passkey / fingerprint-key glyph, inheriting the current text color. */
export default function PasskeyIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="10" cy="8" r="5" />
      <path d="M10 13a5 5 0 0 0-5 5v1h7" />
      <circle cx="18" cy="15" r="2.5" />
      <path d="M18 17.5V22l-1.5-1.5L18 19" />
    </svg>
  );
}
