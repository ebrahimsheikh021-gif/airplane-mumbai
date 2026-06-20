import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store';

const API_URL = '/api/arrivals';
const POLL_INTERVAL_MS = 20000;

export function useArrivals() {
  const setArrivals = useStore((s) => s.setArrivals);
  const setLoading = useStore((s) => s.setLoading);
  const setError = useStore((s) => s.setError);
  const timerRef = useRef(null);

  const fetchArrivals = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setArrivals(json.arrivals ?? [], new Date());
    } catch (err) {
      setError(err.message || 'Failed to fetch arrivals');
    } finally {
      setLoading(false);
    }
  }, [setArrivals, setLoading, setError]);

  useEffect(() => {
    fetchArrivals();
    timerRef.current = setInterval(fetchArrivals, POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchArrivals]);

  return { fetchArrivals };
}
