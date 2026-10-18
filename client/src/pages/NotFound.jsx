import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks';
import { BrandMark } from '@/components/layout/Brand';
import { Button, Card } from '@/components/ui';

export default function NotFound() {
  useDocumentTitle('Page not found');

  const { status, hasHouse } = useAuth();
  const homeTo = status === 'authenticated' ? (hasHouse ? '/dashboard' : '/onboarding') : '/';

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16">
      <span
        aria-hidden="true"
        className="aurora-blob left-1/2 top-24 h-72 w-72 -translate-x-1/2 animate-aurora bg-primary/25"
      />
      <span aria-hidden="true" className="dot-grid mask-fade-b absolute inset-0 opacity-30" />

      <Card className="relative w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark size="lg" />

          <p className="tabular text-gradient font-display text-5xl font-extrabold tracking-tight">404</p>

          <div>
            <h1 className="font-display text-lg font-semibold text-foreground">We could not find that page</h1>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
              The link may be broken, or the page may have been moved.
            </p>
          </div>

          <Button as={Link} to={homeTo} icon={ArrowLeft}>
            Take me home
          </Button>
        </div>
      </Card>
    </div>
  );
}
