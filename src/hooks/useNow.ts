import { useState, useEffect } from 'react';

/**
 * Returns a live `Date.now()` value that updates every `intervalMs` milliseconds.
 * Used to drive reactive relative-time displays (e.g. "5s", "3 min", "1 hr").
 * Default interval: 1000ms (every second).
 */
export function useNow(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
