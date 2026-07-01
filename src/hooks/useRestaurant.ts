import { useState, useEffect } from 'react';
import { subscribeToRestaurantBySlug, subscribeToRestaurantByCustomDomain } from '../firebase/db';
import type { Restaurant } from '../types';

export function useRestaurant(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);

    let unsubscribe: () => void;

    if (slug) {
      unsubscribe = subscribeToRestaurantBySlug(slug, (r) => {
        if (!r) {
          setNotFound(true);
          setRestaurant(null);
        } else {
          setNotFound(false);
          setRestaurant(r);
        }
        setLoading(false);
      });
    } else {
      const hostname = window.location.hostname;
      unsubscribe = subscribeToRestaurantByCustomDomain(hostname, (r) => {
        if (!r) {
          setNotFound(true);
          setRestaurant(null);
        } else {
          setNotFound(false);
          setRestaurant(r);
        }
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [slug]);

  return { restaurant, loading, notFound };
}
