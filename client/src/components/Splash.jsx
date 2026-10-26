import { BrandMark } from '@/components/layout/Brand';

/** Full-page loading splash, used while the session is being restored. */
export default function Splash({ message = 'Loading HOUSEHUB...' }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center gap-5 overflow-hidden bg-background">
      <div className="relative flex flex-col items-center gap-4">
        <BrandMark size="xl" />

        <div className="text-center">
          <p className="font-display text-base font-bold tracking-tight text-foreground">HOUSEHUB</p>
          <p className="mt-1 text-xs text-muted">{message}</p>
        </div>

        <span className="h-1 w-36 overflow-hidden rounded-full bg-surface-muted">
          <span className="skeleton block h-full w-full rounded-full" />
        </span>
      </div>
    </div>
  );
}
