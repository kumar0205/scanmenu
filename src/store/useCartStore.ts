import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrderItem } from '../types';

export type CartItem = OrderItem & { imageUrl: string };

interface CartState {
  cart: CartItem[];
  cartOpen: boolean;
  customerName: string;
  note: string;
  tableNumber: string;
  tableId: string;
  activeTab: 'menu' | 'history';
  
  // Actions
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  setCartOpen: (open: boolean) => void;
  setCustomerName: (name: string) => void;
  setNote: (note: string) => void;
  setTableNumber: (table: string) => void;
  setTableId: (id: string) => void;
  setActiveTab: (tab: 'menu' | 'history') => void;
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
      
      addToCart: (item) => set((state) => {
        const existing = state.cart.find((i) => i.itemId === item.id);
        if (existing) {
          return {
            cart: state.cart.map((i) =>
              i.itemId === item.id ? { ...i, qty: i.qty + 1 } : i
            ),
          };
        }
        return {
          cart: [...state.cart, {
            itemId: item.id,
            name: item.name,
            price: item.price,
            qty: 1,
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
      setTableNumber: (table) => set({ tableNumber: table }),
      setTableId: (id) => set({ tableId: id }),
      setActiveTab: (tab) => set({ activeTab: tab }),
    }),
    {
      name: 'scanmenu-cart-storage',
      skipHydration: true,
      partialize: (state) => ({ 
        cart: state.cart, 
        customerName: state.customerName,
        tableNumber: state.tableNumber 
      }),
    }
  )
);
