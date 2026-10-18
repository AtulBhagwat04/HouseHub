import { BrandMark } from '@/components/layout/Brand';

/** Full-page loading splash, used while the session is being restored. */
export default function Splash({ message = 'Loading HOUSEHUB...' }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-background">
      {/* Ambient accent glow, matching the app shell. */}
      <span
        aria-hidden="true"
        className="aurora-blob left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 animate-glow-pulse bg-gradient-primary opacity-25"
      />

      <div className="relative flex flex-col items-center gap-4">
        <BrandMark size="xl" className="animate-float" />

        <div className="text-center">
          <p className="font-display text-lg font-extrabold tracking-tight text-foreground">HOUSEHUB</p>
          <p className="mt-1 text-sm text-muted">{message}</p>
        </div>

        <span className="h-1 w-44 overflow-hidden rounded-full bg-surface-muted">
          <span className="skeleton block h-full w-full rounded-full" />
        </span>
      </div>
    </div>
  );
}
