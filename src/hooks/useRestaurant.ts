import { useState, useEffect } from 'react';
import { subscribeToRestaurantBySlug } from '../firebase/db';
import type { Restaurant } from '../types';

export function useRestaurant(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setNotFound(false);

    const unsubscribe = subscribeToRestaurantBySlug(slug, (r) => {
      if (!r) {
        setNotFound(true);
        setRestaurant(null);
      } else {
        setNotFound(false);
        setRestaurant(r);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [slug]);

  return { restaurant, loading, notFound };
}
