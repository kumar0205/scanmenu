import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';
import { getRestaurantByOwnerId } from '../firebase/db';
import type { Restaurant } from '../types';
import { mockRestaurant } from '../lib/mockData';

interface AuthContextType {
  user: User | null;
  restaurant: Restaurant | null;
  restaurantId: string | null;
  loading: boolean;
  setRestaurant: (r: Restaurant | null) => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  restaurant: null,
  restaurantId: null,
  loading: true,
  setRestaurant: () => {},
  isDemo: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

    if (!hasFirebase) {
      // Demo mode: skip Firebase, use mock data
      setIsDemo(true);
      setRestaurant(mockRestaurant);
      setLoading(false);
      return;
    }

    const unsub = onAuthChange(u => {
      setUser(u);
      if (u) {
        getRestaurantByOwnerId(u.uid).then(r => {
          setRestaurant(r);
          setLoading(false);
        });
      } else {
        setRestaurant(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{ user, restaurant, restaurantId: restaurant?.id ?? null, loading, setRestaurant, isDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
