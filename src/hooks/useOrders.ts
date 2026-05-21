import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders } from '../firebase/db';
import { mockOrders } from '../lib/mockData';
import type { Order } from '../types';

function playNotification() {
  try {
    const ctx = new AudioContext();
    const freqs = [880, 1100, 880];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.1);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.15);
    });
  } catch (_) {
    // AudioContext not available
  }
}

export function useOrders(restaurantId: string | null) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!restaurantId) return;

    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

    if (!hasFirebase) {
      // Demo mode: use mock data
      setOrders(mockOrders);
      setLoading(false);
      return;
    }

    const unsub = subscribeToOrders(restaurantId, incoming => {
      if (!isFirstLoad.current) {
        const newOrders = incoming.filter(
          o => !prevIdsRef.current.has(o.id) && o.status === 'pending'
        );
        if (newOrders.length > 0) {
          playNotification();
        }
      }
      prevIdsRef.current = new Set(incoming.map(o => o.id));
      isFirstLoad.current = false;
      setOrders(incoming);
      setLoading(false);
    });
    return unsub;
  }, [restaurantId]);

  return { orders, loading };
}
