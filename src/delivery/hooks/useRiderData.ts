import { useState, useEffect, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { 
  subscribeToRiderProfile, 
  subscribeToAvailableOrders, 
  subscribeToRiderOrders,
  syncRiderProfile
} from '../firebase/riderDb';
import type { DeliveryBoy, InAppNotification } from '../types';
import type { Order } from '../../types';
import toast from 'react-hot-toast';

export function useRiderData() {
  const { user } = useAuthContext();
  const [profile, setProfile] = useState<DeliveryBoy | null>(null);
  const [availableOrders, setAvailableOrders] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const prevAvailableRef = useRef<Order[]>([]);
  const prevMyOrdersRef = useRef<Order[]>([]);

  // Sync / initialize profile when user is available
  useEffect(() => {
    if (!user) return;
    
    let active = true;
    syncRiderProfile(user.uid, user.displayName || 'Rider', user.phoneNumber || '')
      .then((rider) => {
        if (active) setProfile(rider);
      })
      .catch((err) => console.error('Error syncing rider profile:', err));

    return () => {
      active = false;
    };
  }, [user]);

  // Subscribe to rider profile
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeToRiderProfile(user.uid, (data) => {
      setProfile(data);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  // Subscribe to available orders
  useEffect(() => {
    if (!user || !profile?.isOnline) {
      setAvailableOrders([]);
      return;
    }

    const unsub = subscribeToAvailableOrders(null, (orders) => {
      // Trigger notifications for new available ready orders
      const prevIds = prevAvailableRef.current.map(o => o.id);
      orders.forEach(order => {
        if (!prevIds.includes(order.id)) {
          // Notify
          const newNotif: InAppNotification = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'new_order',
            title: 'New Ready Order!',
            body: `Order #${order.dailyOrderId || order.id.slice(0, 6)} is ready for pickup.`,
            createdAt: Date.now(),
            read: false,
            orderId: order.id,
            restaurantId: (order as any).restaurantId
          };
          setNotifications(prev => [newNotif, ...prev]);
          toast.success(`New pickup available: Order #${order.dailyOrderId || order.id.slice(0, 6)}`);
        }
      });
      prevAvailableRef.current = orders;
      setAvailableOrders(orders);
    });

    return unsub;
  }, [user, profile?.isOnline]);

  // Subscribe to my orders (assigned to current rider)
  useEffect(() => {
    if (!user) return;

    const unsub = subscribeToRiderOrders(null, user.uid, (orders) => {
      const prev = prevMyOrdersRef.current;
      
      orders.forEach(order => {
        const prevOrder = prev.find(o => o.id === order.id);
        if (prevOrder) {
          if (prevOrder.status !== order.status) {
            // Status changed
            let type: InAppNotification['type'] = 'assigned';
            let title = 'Order Updated';
            let body = `Order #${order.dailyOrderId || order.id.slice(0, 6)} status is now ${order.status}.`;
            
            if (order.status === 'delivered') {
              type = 'completed';
              title = 'Delivery Completed!';
              body = `Great job! Order #${order.dailyOrderId || order.id.slice(0, 6)} has been successfully delivered.`;
              toast.success(title);
            } else if (order.status === 'cancelled') {
              type = 'order_cancelled';
              title = 'Order Cancelled';
              body = `Alert: Order #${order.dailyOrderId || order.id.slice(0, 6)} has been cancelled.`;
              toast.error(title);
            }
            
            const newNotif: InAppNotification = {
              id: Math.random().toString(36).substr(2, 9),
              type,
              title,
              body,
              createdAt: Date.now(),
              read: false,
              orderId: order.id,
              restaurantId: (order as any).restaurantId
            };
            setNotifications(prevNotifs => [newNotif, ...prevNotifs]);
          }
        } else {
          // New assignment
          const newNotif: InAppNotification = {
            id: Math.random().toString(36).substr(2, 9),
            type: 'assigned',
            title: 'Order Assigned',
            body: `Order #${order.dailyOrderId || order.id.slice(0, 6)} has been assigned to you.`,
            createdAt: Date.now(),
            read: false,
            orderId: order.id,
            restaurantId: (order as any).restaurantId
          };
          setNotifications(prevNotifs => [newNotif, ...prevNotifs]);
          toast.success(`Assigned to Order #${order.dailyOrderId || order.id.slice(0, 6)}`);
        }
      });

      prevMyOrdersRef.current = orders;
      setMyOrders(orders);
    });

    return unsub;
  }, [user]);

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  return {
    profile,
    availableOrders,
    myOrders,
    notifications,
    loading,
    markNotificationRead,
    clearNotifications
  };
}
