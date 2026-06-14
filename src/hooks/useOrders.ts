import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders } from '../firebase/db';
import type { Order } from '../types';

function playNotification() {
  try {
    const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
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
    setTimeout(() => {
      ctx.close().catch(console.error);
    }, 1000);
  } catch {
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
