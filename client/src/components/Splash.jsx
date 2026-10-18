/** Full-page loading splash, used while the session is being restored. */
export default function Splash({ message = 'Loading HOUSEHUB...' }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <span className="flex h-14 w-14 animate-pop-in items-center justify-center rounded-2xl bg-primary text-primary-fg shadow-raised">
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.1"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.6V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.6" />
        </svg>
      </span>

      <div className="text-center">
        <p className="text-lg font-bold tracking-tight text-foreground">HOUSEHUB</p>
        <p className="mt-1 text-sm text-muted">{message}</p>
      </div>

      <span className="h-1 w-40 overflow-hidden rounded-full bg-surface-muted">
        <span className="block h-full w-1/2 animate-pulse rounded-full bg-primary" />
      </span>
    </div>
  );
}
