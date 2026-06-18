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
  coverImages?: string[];
  coverImageUrl?: string;
  description?: string;
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
  upiType?: 'merchant' | 'personal';
  waterBottle?: {
    enabled: boolean;
    price: number;
    ml?: number;
    options?: Array<{ id: string; ml: string; price: number }>;
  };
  callWaiter?: {
    enabled: boolean;
  };
  tax?: {
    cgstEnabled: boolean;
    cgstPercent: number;
    sgstEnabled: boolean;
    sgstPercent: number;
  };
  notificationSoundUrl?: string;
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
  isCombo?: boolean;
  comboPrices?: Array<{ persons: number; price: number }>;
}

export interface Table {
  id: string;
  number: string;
  status: 'available' | 'occupied' | 'inactive';
  currentOrderId: string | null;
  qrToken?: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
  isExtra?: boolean;
  status?: 'pending' | 'preparing' | 'ready';
  categoryId?: string;
  categoryName?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  tableId: string;
  tableNumber: string;
  items: OrderItem[];
  totalAmount: number;
  status: 'pending' | 'accepted' | 'preparing' | 'ready' | 'completed' | 'cancelled';
  note: string;
  ratingSubmitted: boolean;
  sessionId?: string;
  paymentStatus?: 'unpaid' | 'verifying' | 'paid';
  isParcel?: boolean;
  createdAt: Timestamp;
  dailyOrderId?: number;
  orderDate?: string;
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
  type?: 'water' | 'waiter' | 'payment';
  status: 'pending' | 'completed';
  createdAt: Timestamp;
  ml?: number | string;
  price?: number;
  // Payment confirmation fields
  amount?: number;
  orderId?: string;
  dailyOrderId?: number;
  customerName?: string;
}

export interface DayAnalytics {
  date: string;
  dayOfWeek: string;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  peakHour: string;
  bestHour?: string;
  highestSingleOrder: number;
  bestSellingItem: string;
  hourlyRevenue: Record<string, number>;
  topItems: Record<string, number>;
  topItemsRevenue?: Record<string, number>;
  categoryRevenue: Record<string, number>;
  categoryItems: Record<string, number>;
  repeatCustomers?: number;
  averageItemsPerOrder?: number;
  itemsCountSum?: number;
  insights: any[];
}

export interface MonthAnalytics {
  month: string;
  daysElapsed: number;
  totalRevenue: number;
  totalOrders: number;
  topItems: Record<string, number>;
  topItemsRevenue?: Record<string, number>;
  categoryRevenue: Record<string, number>;
  weekdayAverages: Record<string, number>;
  weekdayRevenue?: Record<string, number>;
  weekdayCounts?: Record<string, number>;
  uniqueDates?: string[];
  bestDay: string;
  highestRevenueDay: number;
  dailyRevenueTrend?: Record<string, number>;
  lastUpdated: string;
  bestHour?: string;
  peakHour?: string;
  highestSingleOrder?: number;
  hourlyRevenue?: Record<string, number>;
  repeatCustomers?: number;
  averageItemsPerOrder?: number;
  itemsCountSum?: number;
}

