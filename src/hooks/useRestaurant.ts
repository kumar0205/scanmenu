import { useState, useEffect } from 'react';
import { getRestaurantBySlug } from '../firebase/db';
import { mockRestaurant } from '../lib/mockData';
import type { Restaurant } from '../types';

export function useRestaurant(slug: string | undefined) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;

    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

    if (!hasFirebase) {
      // Demo mode: match mock restaurant slug or any slug
      if (slug === mockRestaurant.slug || slug === 'demo') {
        setRestaurant(mockRestaurant);
      } else {
        // Allow any slug in demo mode for easy testing
        setRestaurant({ ...mockRestaurant, slug });
      }
      setLoading(false);
      return;
    }

    getRestaurantBySlug(slug).then(r => {
      if (!r) setNotFound(true);
      else setRestaurant(r);
      setLoading(false);
    });
  }, [slug]);

  return { restaurant, loading, notFound };
}
