import { useState, useEffect } from 'react';
import { type User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';
import { getRestaurantByOwnerId } from '../firebase/db';
import type { Restaurant } from '../types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(u => {
      setUser(u);
      if (u) {
        getRestaurantByOwnerId(u.uid).then(r => {
          setRestaurant(r);
          setRestaurantId(r?.id ?? null);
          setLoading(false);
        });
      } else {
        setRestaurant(null);
        setRestaurantId(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return { user, loading, restaurant, restaurantId };
}
