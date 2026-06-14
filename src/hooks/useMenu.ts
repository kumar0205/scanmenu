import { useState, useEffect } from 'react';
import { subscribeToCategories, subscribeToItems } from '../firebase/db';
import type { Category, MenuItem } from '../types';

export function useMenu(restaurantId: string | null) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    let catsLoaded = false;
    let itemsLoaded = false;
    const check = () => { if (catsLoaded && itemsLoaded) setLoading(false); };

    const u1 = subscribeToCategories(restaurantId, cats => {
      setCategories(cats);
      catsLoaded = true;
      check();
    });
    const u2 = subscribeToItems(restaurantId, its => {
      setItems(its);
      itemsLoaded = true;
      check();
    });
    return () => { u1(); u2(); };
  }, [restaurantId]);

  return { categories, items, loading };
}
