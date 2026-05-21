import { Timestamp } from 'firebase/firestore';

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logoUrl: string;
  phone: string;
  address: string;
  currency: string;
  googleReviewUrl: string;
  streetArea?: string;
  town?: string;
  state?: string;
  rewards: {
    active: boolean;
    discountPercent: number;
    discountLabel: string;
    dessertLabel: string;
    dessertDescription: string;
  };
  plan: 'free' | 'pro' | 'business';
  ownerId: string;
  upiId?: string;
  waterBottle?: {
    enabled: boolean;
    price: number;
  };
  callWaiter?: {
    enabled: boolean;
  };
  createdAt: Timestamp;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  categoryId: string;
  isVeg: boolean;
  isAvailable: boolean;
  order: number;
  createdAt: Timestamp;
}

export interface Table {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'inactive';
  currentOrderId: string | null;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
}

export interface Order {
  id: string;
  customerName: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  note: string;
  ratingSubmitted: boolean;
  sessionId?: string;
  paymentStatus?: 'unpaid' | 'paid';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Rating {
  id: string;
  orderId: string;
  customerName: string;
  tableNumber: string;
  stars: number;
  comment: string;
  rewardClaimed: 'discount' | 'dessert' | null;
  verified: boolean;
  createdAt: Timestamp;
}

export interface User {
  restaurantId: string;
  email: string;
  displayName: string;
  role: 'owner';
  createdAt: Timestamp;
}

export interface WaterRequest {
  id: string;
  tableNumber: string;
  qty: number;
  type?: 'water' | 'waiter';
  status: 'pending' | 'completed';
  createdAt: Timestamp;
}
