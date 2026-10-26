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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 py-16">
      <Card className="relative w-full max-w-md">
        <div className="flex flex-col items-center gap-4 text-center">
          <BrandMark size="lg" />

          <p className="tabular font-display text-4xl font-bold tracking-tight text-primary">404</p>

          <div>
            <h1 className="font-display text-base font-semibold text-foreground">We could not find that page</h1>
            <p className="mx-auto mt-1 max-w-sm text-xs text-muted">
              The link may be broken, or the page may have been moved.
            </p>
          </div>

          <Button as={Link} to={homeTo} icon={ArrowLeft} size="sm">
            Take me home
          </Button>
        </div>
      </Card>
    </div>
  );
}