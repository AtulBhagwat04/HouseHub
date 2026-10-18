import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as notificationService from '@/services/notificationService';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

/**
 * Unread notification count for the header bell.
 *
 * Polled rather than pushed. Socket.IO is on the roadmap but deliberately not in
 * the MVP stack, and a 60s poll on a single cheap count query is a much smaller
 * footprint than a websocket server. The interval pauses while the tab is hidden
 * so a backgrounded tab is not quietly hammering the API.
 */
const POLL_INTERVAL_MS = 60_000;

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const timerRef = useRef(null);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setUnreadCount(await notificationService.fetchUnreadCount());
    } catch {
      // A failed poll is not worth telling the user about; the next tick retries.
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnreadCount(0);
      return undefined;
    }

    refreshUnread();

    function start() {
      stop();
      timerRef.current = setInterval(refreshUnread, POLL_INTERVAL_MS);
    }
    function stop() {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    function handleVisibility() {
      if (document.hidden) {
        stop();
      } else {
        refreshUnread();
        start();
      }
    }

    start();
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnread,
      setUnreadCount,
      markAllRead: async () => {
        setUnreadCount(0);
        try {
          await notificationService.markAllRead();
        } finally {
          refreshUnread();
        }
      },
      decrement: (by = 1) => setUnreadCount((current) => Math.max(0, current - by)),
    }),
    [unreadCount, refreshUnread],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return context;
}

export default NotificationContext;
