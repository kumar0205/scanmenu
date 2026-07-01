import { useState, useEffect, useRef } from 'react';
import { subscribeToOrders } from '../firebase/db';
import { useAuthContext } from '../context/AuthContext';
import type { Order } from '../types';
import { requestNotificationPermission, showLocalNotification, playNotification } from '../utils/notifications';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export function useOrders(restaurantId: string | null, selectedDateStr?: string) {
  const { restaurant } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const prevOrdersRef = useRef<Map<string, Order>>(new Map());
  const isFirstLoad = useRef(true);

  // Keep a ref to restaurant to avoid unsubscribing and resubscribing to Firestore orders list
  // whenever the notification sound URL or currency settings are updated.
  const restaurantRef = useRef(restaurant);
  useEffect(() => {
    restaurantRef.current = restaurant;
  }, [restaurant]);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60000));
    const todayStr = istTime.toISOString().split('T')[0];
    const targetDateStr = selectedDateStr || todayStr;

    if (targetDateStr !== todayStr) {
      setLoading(true);
      let activeUnsub: (() => void) | null = null;
      const snapRef = doc(db, 'restaurants', restaurantId, 'dailySnapshots', targetDateStr);
      getDoc(snapRef).then((snapDoc) => {
        if (snapDoc.exists()) {
          const snapData = snapDoc.data();
          setOrders(snapData.orders || []);
          setLoading(false);
        } else {
          activeUnsub = fallbackFilterLiveOrders(targetDateStr);
        }
      }).catch(err => {
        console.error("Failed to load snapshot orders:", err);
        activeUnsub = fallbackFilterLiveOrders(targetDateStr);
      });
      return () => {
        if (activeUnsub) activeUnsub();
      };
    }

    const unsub = subscribeToOrders(restaurantId, incoming => {
      if (!isFirstLoad.current) {
        let shouldPlaySound = false;

        // 1. Check for new pending orders
        const newOrders = incoming.filter(
          o => !prevOrdersRef.current.has(o.id) && o.status === 'pending'
        );
        if (newOrders.length > 0) {
          shouldPlaySound = true;
          newOrders.forEach(order => {
            const currency = restaurantRef.current?.currency ?? '₹';
            showLocalNotification(
              `New Order (Table ${order.tableNumber || 'Takeaway'}) 🛎️`,
              `${order.customerName || 'Customer'} ordered ${order.items.length} item(s) for ${currency}${order.totalAmount}`
            );
          });
        }

        // 2. Check for new payment verification requests (paymentStatus changes to 'verifying')
        const newPaymentRequests = incoming.filter(o => {
          const prev = prevOrdersRef.current.get(o.id);
          // Trigger notification if it's currently verifying, and either we haven't seen it, or its previous status was not verifying
          return o.paymentStatus === 'verifying' && (!prev || prev.paymentStatus !== 'verifying');
        });
        if (newPaymentRequests.length > 0) {
          shouldPlaySound = true;
          newPaymentRequests.forEach(order => {
            const currency = restaurantRef.current?.currency ?? '₹';
            showLocalNotification(
              `Confirm Payment (Table ${order.tableNumber || 'Takeaway'}) 💳`,
              `${order.customerName || 'Customer'} submitted payment of ${currency}${order.totalAmount} for verification.`
            );
          });
        }

        if (shouldPlaySound) {
          playNotification(restaurantRef.current?.notificationSoundUrl);
        }
      }

      // Update our map of previous orders
      const newMap = new Map<string, Order>();
      incoming.forEach(o => newMap.set(o.id, o));
      prevOrdersRef.current = newMap;
      isFirstLoad.current = false;
      
      setOrders(incoming.filter(o => o.orderDate === todayStr));
      setLoading(false);
    });
    return unsub;

    function fallbackFilterLiveOrders(dateStr: string) {
      return subscribeToOrders(restaurantId!, incoming => {
        const filtered = incoming.filter(o => o.orderDate === dateStr);
        setOrders(filtered);
        setLoading(false);
      });
    }
  }, [restaurantId, selectedDateStr]);

  return { orders, loading };
}

