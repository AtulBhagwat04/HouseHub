import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';
import Button from '@/components/ui/Button';

/**
 * Catches render-time crashes inside the app shell so a bug on one page shows a
 * recoverable panel instead of a blank white screen. Request errors are already
 * normalised by the API layer; this is only for genuine React faults.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Kept as a console error on purpose: there is no error-reporting service in
    // the MVP stack, and swallowing it would make local debugging much harder.
    console.error('Unhandled UI error:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-error-soft text-error">
          <TriangleAlert className="h-6 w-6" aria-hidden="true" />
        </span>

        <div className="max-w-sm space-y-1">
          <h2 className="font-semibold text-foreground">This page hit a snag</h2>
          <p className="text-sm text-muted">
            Something went wrong while rendering this screen. Your data has not been changed.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={() => this.setState({ error: null })}
          >
            Try again
          </Button>
          <Button size="sm" onClick={() => window.location.assign('/dashboard')}>
            Back to dashboard
          </Button>
        </div>
      </div>
    );
  }
}
