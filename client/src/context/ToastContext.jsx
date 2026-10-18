import { createContext, useCallback, useContext, useMemo } from 'react';
import { Toaster, toast } from 'sonner';
import { useTheme } from '@/context/ThemeContext';

const ToastContext = createContext(null);

const DURATIONS = {
  success: 4000,
  error: 7000,
  warning: 5500,
  info: 4500,
};

/**
 * App-wide toasts, backed by Sonner.
 *
 * The public API is deliberately unchanged from the previous hand-rolled
 * implementation (`success` / `error` / `warning` / `info` / `fromError` /
 * `push` / `dismiss`), so no page had to be touched when the rendering moved to
 * Sonner - only this file knows how a toast is drawn.
 *
 * Every failed request surfaces here with the server's own `message`, which is
 * already written for humans - so users never see a raw stack trace or a bare
 * "Request failed with status code 500".
 */
export function ToastProvider({ children }) {
  const { resolved } = useTheme();

  const push = useCallback((type, message, { title, duration } = {}) => {
    if (!message) return null;

    // Sonner treats the main string as the bold line and `description` as the
    // muted second line, which maps onto our optional `title` + `message`.
    const text = title || message;

    // Deriving the id from the content collapses an identical repeat into the
    // existing toast instead of stacking a duplicate.
    const id = `${type}:${text}:${title ? message : ''}`;

    const options = {
      id,
      duration: duration ?? DURATIONS[type] ?? DURATIONS.info,
      description: title ? message : undefined,
    };

    const emit = typeof toast[type] === 'function' ? toast[type] : toast.info;
    return emit(text, options);
  }, []);

  const dismiss = useCallback((id) => toast.dismiss(id), []);

  const value = useMemo(
    () => ({
      push,
      dismiss,
      success: (message, options) => push('success', message, options),
      error: (message, options) => push('error', message, options),
      warning: (message, options) => push('warning', message, options),
      info: (message, options) => push('info', message, options),
      /** Convenience for catch blocks. */
      fromError: (error, fallback = 'Something went wrong') => push('error', error?.message || fallback),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <Toaster
        theme={resolved}
        position="bottom-right"
        offset={16}
        // Lifted clear of the mobile bottom bar, which would otherwise sit on
        // top of the toast.
        mobileOffset={{ bottom: '5.75rem', left: '0.75rem', right: '0.75rem' }}
        gap={10}
        closeButton
        toastOptions={{
          classNames: {
            toast:
              '!rounded-2xl !border !border-border !bg-surface-raised/95 !text-foreground !shadow-pop !backdrop-blur-xl',
            title: '!font-display !text-sm !font-semibold !text-foreground',
            description: '!text-xs !text-muted',
            closeButton: '!border-border !bg-surface !text-muted',
          },
        }}
      />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used inside <ToastProvider>');
  return context;
}

export default ToastContext;
