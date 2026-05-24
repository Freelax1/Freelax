/** Loading spinner for auth forms (forest panel on dark background) */
export default function AuthSpinner() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className="animate-fd-spin shrink-0"
      aria-hidden
    >
      <circle cx="8" cy="8" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="2" />
      <path
        d="M8 2a6 6 0 0 1 6 6"
        stroke="var(--text-on-dark)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}
