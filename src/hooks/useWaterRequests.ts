import { useState, useEffect, useRef } from 'react';
import { subscribeToWaterRequests } from '../firebase/db';
import type { WaterRequest } from '../types';
import { useAuthContext } from '../context/AuthContext';
import { playNotification, showLocalNotification } from '../utils/notifications';

export function useWaterRequests(
  restaurantId: string | null,
  statusFilter: 'pending' | 'completed' = 'pending'
) {
  const { restaurant } = useAuthContext();
  const [requests, setRequests] = useState<WaterRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  // Keep a ref to restaurant to avoid resubscribing if settings change
  const restaurantRef = useRef(restaurant);
  useEffect(() => {
    restaurantRef.current = restaurant;
  }, [restaurant]);

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
      // Only trigger notification sounds/banners if we are subscribing to active/pending requests
      if (statusFilter === 'pending' && !isFirstLoad.current) {
        const newRequests = incoming.filter(
          r => !prevIdsRef.current.has(r.id) && r.status === 'pending'
        );
        if (newRequests.length > 0) {
          playNotification(restaurantRef.current?.notificationSoundUrl);
          newRequests.forEach(req => {
            const title = req.type === 'waiter' ? '🛎️ Waiter Call' : '💧 Water Request';
            const body = req.type === 'waiter'
              ? `Table ${req.tableNumber} called a waiter.`
              : `Table ${req.tableNumber} requested ${req.qty} bottle(s) of mineral water.`;
            showLocalNotification(title, body);
          });
        }
      }

      prevIdsRef.current = new Set(incoming.map(r => r.id));
      isFirstLoad.current = false;
      setRequests(incoming);
      setLoading(false);
    }, statusFilter);
    return unsub;
  }, [restaurantId, statusFilter]);

  return { requests, loading };
}
