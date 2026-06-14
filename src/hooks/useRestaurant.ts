import { useState, useEffect } from 'react';
import { getRestaurantBySlug } from '../firebase/db';
import type { Restaurant } from '../types';

export function useRestaurant(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    setLoading(true);
    setNotFound(false);

    getRestaurantBySlug(slug).then(r => {
      if (!r) setNotFound(true);
      else setRestaurant(r);
      setLoading(false);
    });
  }, [slug]);

  return { restaurant, loading, notFound };
}
