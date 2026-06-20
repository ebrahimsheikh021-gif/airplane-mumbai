import { useCallback, useEffect, useRef, useState } from "react";

const REFRESH_MS = 20000;
const API_URL = "/api/arrivals";

// Polls the backend every 20 seconds and exposes the latest arrivals along
// with loading / error / freshness state.
export function useArrivals() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const fetchArrivals = useCallback(async () => {
    try {
      const res = await fetch(API_URL, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setStatus("ok");
      setError(null);
    } catch (err) {
      setStatus((prev) => (prev === "ok" ? "ok" : "error"));
      setError(err.message || "Network error");
    }
  }, []);

  useEffect(() => {
    fetchArrivals();
    timerRef.current = setInterval(fetchArrivals, REFRESH_MS);
    return () => clearInterval(timerRef.current);
  }, [fetchArrivals]);

  return {
    arrivals: data?.arrivals ?? [],
    count: data?.count ?? 0,
    airport: data?.airport,
    status,
    error,
    lastUpdated,
    refresh: fetchArrivals,
  };
}
