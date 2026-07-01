import { Timestamp } from 'firebase/firestore';
import type { Order } from '../../types';

export interface DeliveryBoy {
  uid: string;
  name: string;
  phone: string;
  vehicle: string;
  vehicleNumber: string;
  profileImage?: string;
  isOnline: boolean;
  currentTown?: string;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
  totalDeliveries: number;
  totalEarnings: number;
  createdAt: Timestamp;
  upiId?: string;
  pendingPayout?: number;
  paidAmount?: number;
  totalCompletedOrders?: number;
  totalCashCollected?: number;
  totalUpiCollected?: number;
  unsettledCash?: number;
  unsettledUpi?: number;
  activeOrderIds?: string[];
  lastSettledAt?: Timestamp;
}

export interface InAppNotification {
  id: string;
  type: 'new_order' | 'order_cancelled' | 'assigned' | 'completed';
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  orderId?: string;
  restaurantId?: string;
}

export interface RiderState {
  profile: DeliveryBoy | null;
  notifications: InAppNotification[];
  availableOrders: Order[];
  myOrders: Order[];
  loading: boolean;
}
