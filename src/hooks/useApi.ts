import { useCallback, useEffect, useRef, useState } from 'react';
import { useHotel } from '../context/HotelContext';
import { AuthApiError } from '../services/authService';

/**
 * Loads data from the backend and reloads whenever `deps` change or any mutation calls `refresh()`.
 * A 401 ends the session so the login screen appears.
 */
export function useApi<T>(fetcher: () => Promise<T>, deps: unknown[] = [], enabled = true) {
  const { dataVersion, expireSession } = useHotel();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fetcherRef.current());
      setError(null);
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) {
        expireSession();
        return;
      }
      setError(err instanceof Error ? err.message : 'Could not load data.');
    } finally {
      setLoading(false);
    }
  }, [expireSession]);

  useEffect(() => {
    if (enabled) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, dataVersion, load, ...deps]);

  return { data, error, loading, reload: load };
}

/** Runs a mutation, surfaces its error message, and refreshes every view on success. */
export function useMutation<A extends unknown[], R>(action: (...args: A) => Promise<R>) {
  const { refresh, expireSession } = useHotel();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (...args: A): Promise<R | undefined> => {
    setPending(true);
    setError(null);
    try {
      const result = await action(...args);
      refresh();
      return result;
    } catch (err) {
      if (err instanceof AuthApiError && err.status === 401) expireSession();
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      return undefined;
    } finally {
      setPending(false);
    }
  };

  return { run, pending, error, clearError: () => setError(null) };
}
