import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const ToastContext = createContext(null);

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    className: 'border-success/30 bg-success-soft text-foreground',
    iconClassName: 'text-success',
    duration: 4000,
  },
  error: {
    icon: XCircle,
    className: 'border-error/30 bg-error-soft text-foreground',
    iconClassName: 'text-error',
    duration: 7000,
  },
  warning: {
    icon: AlertTriangle,
    className: 'border-warning/30 bg-warning-soft text-foreground',
    iconClassName: 'text-warning',
    duration: 5500,
  },
  info: {
    icon: Info,
    className: 'border-primary/25 bg-primary-soft text-foreground',
    iconClassName: 'text-primary',
    duration: 4500,
  },
};

/**
 * App-wide toasts.
 *
 * Every failed request surfaces here with the server's own `message`, which is
 * already written for humans - so users never see a raw stack trace or a bare
 * "Request failed with status code 500".
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());
  const counter = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback(
    (type, message, { title, duration } = {}) => {
      if (!message) return null;

      counter.current += 1;
      const id = `toast-${counter.current}`;
      const variant = VARIANTS[type] || VARIANTS.info;

      setToasts((current) => {
        // Collapse an identical repeat instead of stacking duplicates.
        const existing = current.find((toast) => toast.message === message && toast.type === type);
        if (existing) return current;
        return [...current.slice(-3), { id, type, title, message }];
      });

      const timeout = duration ?? variant.duration;
      if (timeout > 0) {
        timers.current.set(
          id,
          setTimeout(() => dismiss(id), timeout),
        );
      }

      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      warning: (message, options) => push('warning', message, options),
      info: (message, options) => push('info', message, options),
      /** Convenience for catch blocks. */
      fromError: (error, fallback = 'Something went wrong') =>
        push('error', error?.message || fallback),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Region is always mounted so screen readers announce new toasts. */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:top-auto sm:items-end sm:px-0"
      >
        {toasts.map((toast) => {
          const variant = VARIANTS[toast.type] || VARIANTS.info;
          const Icon = variant.icon;

          return (
            <div
              key={toast.id}
              role="status"
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border p-3 shadow-pop backdrop-blur',
                variant.className,
              )}
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', variant.iconClassName)} aria-hidden="true" />

              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-semibold">{toast.title}</p>}
                <p className="break-words text-sm leading-snug text-foreground/90">{toast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted transition hover:bg-background/40 hover:text-foreground"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export default ToastContext;
