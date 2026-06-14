import { useState, useEffect } from 'react';
import { subscribeToWaterRequests } from '../firebase/db';
import type { WaterRequest } from '../types';

export function useWaterRequests(
  restaurantId: string | null,
  statusFilter: 'pending' | 'completed' = 'pending'
) {
  const [requests, setRequests] = useState<WaterRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

    if (!hasFirebase) {
      setRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsub = subscribeToWaterRequests(restaurantId, incoming => {
      setRequests(incoming);
      setLoading(false);
    }, statusFilter);
    return unsub;
  }, [restaurantId, statusFilter]);

  return { requests, loading };
}
