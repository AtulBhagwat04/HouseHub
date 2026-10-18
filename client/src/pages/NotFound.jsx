import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks';
import Button from '@/components/ui/Button';

export default function NotFound() {
  useDocumentTitle('Page not found');

  const { status, hasHouse } = useAuth();
  const homeTo = status === 'authenticated' ? (hasHouse ? '/dashboard' : '/onboarding') : '/';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-background px-4 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <Compass className="h-7 w-7" aria-hidden="true" />
      </span>

      <div>
        <p className="tabular text-4xl font-bold tracking-tight text-foreground">404</p>
        <h1 className="mt-2 text-lg font-semibold text-foreground">We could not find that page</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted">
          The link may be broken, or the page may have been moved.
        </p>
      </div>

      <Button as={Link} to={homeTo} icon={ArrowLeft}>
        Take me home
      </Button>
    </div>
  );
}
