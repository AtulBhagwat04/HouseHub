import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Minimal data-fetching hook: loading / error / data / refetch.
 *
 * Deliberately not a caching library - HOUSEHUB's data is small and always
 * scoped to one house, and a stale cache across houses is a correctness risk
 * (you could briefly see house A's expenses on house B's page). Every page
 * fetches fresh on mount and refetches explicitly after a mutation.
 */
export function useFetch(fetcher, deps = [], { immediate = true } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: immediate });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setState((previous) => ({ ...previous, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (!activeRef.current) return data;
      setState({ data, error: null, loading: false });
      return data;
    } catch (error) {
      if (!activeRef.current) return null;
      setState({ data: null, error, loading: false });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (immediate) load();
  }, [load, immediate]);

  return {
    ...state,
    refetch: load,
    setData: (updater) =>
      setState((previous) => ({
        ...previous,
        data: typeof updater === 'function' ? updater(previous.data) : updater,
      })),
  };
}

/** Debounces a fast-changing value - used by every search box. */
export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}

/** Tracks a CSS media query. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const list = window.matchMedia(query);
    const handler = (event) => setMatches(event.matches);
    setMatches(list.matches);
    list.addEventListener('change', handler);
    return () => list.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

export function useDocumentTitle(title) {
  useEffect(() => {
    const previous = document.title;
    document.title = title ? `${title} · HOUSEHUB` : 'HOUSEHUB';
    return () => {
      document.title = previous;
    };
  }, [title]);
}

/** Closes a popover/menu on outside click or Escape. */
export function useClickOutside(onOutside) {
  const ref = useRef(null);

  useEffect(() => {
    function handlePointer(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside();
    }
    function handleKey(event) {
      if (event.key === 'Escape') onOutside();
    }
    document.addEventListener('mousedown', handlePointer);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onOutside]);

  return ref;
}

export default { useFetch, useDebounced, useMediaQuery, useDocumentTitle, useClickOutside };
