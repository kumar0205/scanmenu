import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { type User } from 'firebase/auth';
import { onAuthChange } from '../firebase/auth';
import { getRestaurantByOwnerId } from '../firebase/db';
import type { Restaurant } from '../types';
import { doc, getDoc, collection, getDocs, query, limit } from 'firebase/firestore';
import { db } from '../firebase/config';

interface AuthContextType {
  user: User | null;
  userRole: string | null;
  restaurant: Restaurant | null;
  restaurantId: string | null;
  loading: boolean;
  setRestaurant: (r: Restaurant | null) => void;
  isDemo: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  restaurant: null,
  restaurantId: null,
  loading: true,
  setRestaurant: () => {},
  isDemo: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem('scanmenu_user_role'));
  const [restaurant, setRestaurant] = useState<Restaurant | null>(() => {
    const saved = localStorage.getItem('scanmenu_user_restaurant');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  // Keep loading state until auth has initialized
  const [loading, setLoading] = useState(true);

  const handleSetRestaurant = (r: Restaurant | null) => {
    setRestaurant(r);
    if (r) {
      localStorage.setItem('scanmenu_user_restaurant', JSON.stringify(r));
    } else {
      localStorage.removeItem('scanmenu_user_restaurant');
    }
    if (r && userRole === 'superAdmin') {
      localStorage.setItem('scanmenu_superadmin_active_restaurant', r.id);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const unsub = onAuthChange(async (u) => {
      if (!isMounted) return;

      setUser(u);
      if (u && !u.isAnonymous) {
        // If we already have cached values, we can immediately let the user in (no spinner)
        const cachedRole = localStorage.getItem('scanmenu_user_role');
        const cachedRest = localStorage.getItem('scanmenu_user_restaurant');
        if (cachedRole && cachedRest) {
          setLoading(false);
        }

        try {
          const userDoc = await getDoc(doc(db, 'users', u.uid));
          let role = 'owner';
          if (userDoc.exists()) {
            role = userDoc.data().role || 'owner';
          } else if (u.email === 'cjvkumarraja@gmail.com') {
            role = 'superAdmin';
          }

          if (isMounted) {
            setUserRole(role);
            localStorage.setItem('scanmenu_user_role', role);
          }

          let r = null;
          if (role === 'superAdmin') {
            const savedId = localStorage.getItem('scanmenu_superadmin_active_restaurant');
            if (savedId) {
              const rDoc = await getDoc(doc(db, 'restaurants', savedId));
              if (rDoc.exists() && isMounted) {
                r = { id: rDoc.id, ...rDoc.data() } as Restaurant;
              }
            }
            if (!r) {
              const snap = await getDocs(query(collection(db, 'restaurants'), limit(1)));
              if (!snap.empty && isMounted) {
                const docSnap = snap.docs[0];
                r = { id: docSnap.id, ...docSnap.data() } as Restaurant;
                localStorage.setItem('scanmenu_superadmin_active_restaurant', r.id);
              }
            }
          } else {
            r = await getRestaurantByOwnerId(u.uid);
          }

          if (r && isMounted) {
            setRestaurant(r);
            localStorage.setItem('scanmenu_user_restaurant', JSON.stringify(r));
          }
        } catch (err) {
          console.error("Error loading user context:", err);
        } finally {
          if (isMounted) {
            setLoading(false);
          }
        }
      } else {
        if (isMounted) {
          setUserRole(null);
          setRestaurant(null);
          localStorage.removeItem('scanmenu_user_role');
          localStorage.removeItem('scanmenu_user_restaurant');
          setLoading(false);
        }
      }
    });
    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, userRole, restaurant, restaurantId: restaurant?.id ?? null, loading, setRestaurant: handleSetRestaurant, isDemo: false }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  return useContext(AuthContext);
}
