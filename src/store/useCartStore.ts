import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { MenuItem, OrderItem } from '../types';

export type CartItem = OrderItem & { imageUrl: string };
type CartInput = Pick<MenuItem, 'id' | 'name' | 'price' | 'isVeg' | 'imageUrl'> & { qty?: number };

interface CartState {
  cart: CartItem[];
  cartOpen: boolean;
  customerName: string;
  note: string;
  tableNumber: string;
  tableId: string;
  activeTab: 'menu' | 'history';
  restaurantId: string;
  
  // Actions
  addToCart: (item: CartInput) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setCustomerName: (name: string) => void;
  setNote: (note: string) => void;
  setTableNumber: (table: string) => void;
  setTableId: (id: string) => void;
  setActiveTab: (tab: 'menu' | 'history') => void;
  setRestaurantId: (id: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      cart: [],
      cartOpen: false,
      customerName: '',
      note: '',
      tableNumber: '',
      tableId: '',
      activeTab: 'menu',
      restaurantId: '',
      
      addToCart: (item) => set((state) => {
        const existing = state.cart.find((i) => i.itemId === item.id);
        const qtyToAdd = Math.max(1, Math.floor(item.qty ?? 1));
        if (existing) {
          return {
            cart: state.cart.map((i) =>
              i.itemId === item.id ? { ...i, qty: i.qty + qtyToAdd } : i
            ),
          };
        }
        return {
          cart: [...state.cart, {
            itemId: item.id,
            name: item.name,
            price: item.price,
            qty: qtyToAdd,
            isVeg: item.isVeg,
            imageUrl: item.imageUrl
          }],
        };
      }),
      removeFromCart: (itemId) => set((state) => {
        const existing = state.cart.find((i) => i.itemId === itemId);
        if (existing && existing.qty > 1) {
          return {
            cart: state.cart.map((i) =>
              i.itemId === itemId ? { ...i, qty: i.qty - 1 } : i
            ),
          };
        }
        return {
          cart: state.cart.filter((i) => i.itemId !== itemId),
        };
      }),
      clearCart: () => set({ cart: [] }),
      setCartOpen: (open) => set({ cartOpen: open }),
      setCustomerName: (name) => set({ customerName: name }),
      setNote: (note) => set({ note }),
      setTableNumber: (table) => set((state) => {
        if (state.tableNumber && state.tableNumber !== table) {
          return { tableNumber: table, cart: [], note: '' };
        }
        return { tableNumber: table };
      }),
      setTableId: (id) => set((state) => {
        if (state.tableId && state.tableId !== id) {
          return { tableId: id, cart: [], note: '' };
        }
        return { tableId: id };
      }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setRestaurantId: (id) => set((state) => {
        // Clear cart if the restaurant changed (prevents mixing items from different restaurants)
        if (state.restaurantId && state.restaurantId !== id) {
          return { restaurantId: id, cart: [], note: '' };
        }
        return { restaurantId: id };
      }),
    }),
    {
      name: 'scanmenu-cart-storage',
      partialize: (state) => ({ 
        cart: state.cart, 
        customerName: state.customerName,
        tableNumber: state.tableNumber,
        restaurantId: state.restaurantId,
      }),
    }
  )
);
