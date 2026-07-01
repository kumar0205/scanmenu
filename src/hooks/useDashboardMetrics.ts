import { useState, useEffect } from 'react';
import { subscribeToOrders } from '../firebase/db';
import type { Order } from '../types';
import { doc, getDoc, setDoc, getDocs, collection, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export interface DashboardMetrics {
  todayRevenue: number;
  todayOrdersCount: number;
  averageOrderValue: number;
  pendingCount: number;
  preparingCount: number;
  readyCount: number;
  servedCount: number;
  outForDeliveryCount: number;
  deliveredCount: number;
  cancelledCount: number;
  dineInCount: number;
  deliveryCount: number;
  topItems: Array<{ name: string; qty: number }>;
  recentOrders: Order[];
}

export function useDashboardMetrics(restaurantId: string | null, selectedDateStr?: string) {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todayRevenue: 0,
    todayOrdersCount: 0,
    averageOrderValue: 0,
    pendingCount: 0,
    preparingCount: 0,
    readyCount: 0,
    servedCount: 0,
    outForDeliveryCount: 0,
    deliveredCount: 0,
    cancelledCount: 0,
    dineInCount: 0,
    deliveryCount: 0,
    topItems: [],
    recentOrders: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!restaurantId) return;

    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60000));
    const todayStr = istTime.toISOString().split('T')[0];
    const targetDateStr = selectedDateStr || todayStr;

    // IF past date, query snapshot first
    if (targetDateStr !== todayStr) {
      setLoading(true);
      const snapshotRef = doc(db, 'restaurants', restaurantId, 'dailySnapshots', targetDateStr);
      getDoc(snapshotRef).then((snapDoc) => {
        if (snapDoc.exists()) {
          const snapData = snapDoc.data();
          setMetrics(snapData.metrics);
          setLoading(false);
        } else {
          // Fallback: calculate from all orders if snapshot not present
          calculateFromOrdersFallback(targetDateStr);
        }
      }).catch(err => {
        console.error("Failed to load snapshot:", err);
        calculateFromOrdersFallback(targetDateStr);
      });
      return;
    }

    // IF today, subscribe to live orders and auto-save the snapshot
    const unsubscribe = subscribeToOrders(restaurantId, async (allOrders) => {
      const todayOrders = allOrders.filter(o => o.orderDate === todayStr);

      const completedOrders = todayOrders.filter(
        o => o.status !== 'cancelled' && (o.status === 'completed' || o.status === 'served' || o.status === 'delivered' || o.paymentStatus === 'paid')
      );
      const todayRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

      let pendingCount = 0;
      let preparingCount = 0;
      let readyCount = 0;
      let servedCount = 0;
      let outForDeliveryCount = 0;
      let deliveredCount = 0;
      let cancelledCount = 0;
      let dineInCount = 0;
      let deliveryCount = 0;

      todayOrders.forEach(o => {
        const status = o.status;
        if (status === 'pending') pendingCount++;
        else if (status === 'preparing') preparingCount++;
        else if (status === 'ready') readyCount++;
        else if (status === 'served' || status === 'completed') servedCount++;
        else if (status === 'out_for_delivery' || (status as any) === 'outForDelivery') outForDeliveryCount++;
        else if (status === 'delivered') deliveredCount++;
        else if (status === 'cancelled') cancelledCount++;

        if (status !== 'cancelled') {
          if (o.orderType === 'delivery') {
            deliveryCount++;
          } else {
            dineInCount++;
          }
        }
      });

      const validOrdersCount = todayOrders.filter(o => o.status !== 'cancelled').length;
      const averageOrderValue = validOrdersCount > 0 ? todayRevenue / validOrdersCount : 0;

      const itemQtyMap: Record<string, { name: string; qty: number }> = {};
      todayOrders.forEach(o => {
        if (o.status !== 'cancelled') {
          o.items.forEach(item => {
            const key = item.itemId;
            if (!itemQtyMap[key]) {
              itemQtyMap[key] = { name: item.name, qty: 0 };
            }
            itemQtyMap[key].qty += item.qty;
          });
        }
      });

      const topItems = Object.values(itemQtyMap)
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 5);

      const calculatedMetrics = {
        todayRevenue,
        todayOrdersCount: validOrdersCount,
        averageOrderValue,
        pendingCount,
        preparingCount,
        readyCount,
        servedCount,
        outForDeliveryCount,
        deliveredCount,
        cancelledCount,
        dineInCount,
        deliveryCount,
        topItems,
        recentOrders: allOrders.slice(0, 5)
      };

      setMetrics(calculatedMetrics);
      setLoading(false);

      // Auto-save this snapshot tonight/now!
      try {
        // Fetch all platform riders to snapshot their metrics too
        const ridersSnap = await getDocs(collection(db, 'deliveryBoys'));
        const ridersList = ridersSnap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name || '',
            phone: data.phone || '',
            vehicle: data.vehicle || '',
            isOnline: data.isOnline || false,
            status: data.status || '',
            deliveriesToday: data.deliveriesToday || 0,
            earningsToday: data.earningsToday || 0,
            rating: data.rating || 0
          };
        });

        // Save snapshot document
        const snapshotRef = doc(db, 'restaurants', restaurantId, 'dailySnapshots', todayStr);
        await setDoc(snapshotRef, {
          date: todayStr,
          metrics: calculatedMetrics,
          orders: todayOrders.map(o => ({
            id: o.id || '',
            dailyOrderId: o.dailyOrderId || '',
            customerName: o.customerName || '',
            customerPhone: o.customerPhone || '',
            orderType: o.orderType || '',
            status: o.status || '',
            paymentStatus: o.paymentStatus || '',
            paymentMethod: o.paymentMethod || '',
            totalAmount: o.totalAmount || 0,
            createdAt: o.createdAt || null,
            items: o.items || []
          })),
          riders: ridersList,
          updatedAt: Timestamp.now()
        });
      } catch (err) {
        console.error("Failed to auto-save daily snapshot:", err);
      }
    });

    return unsubscribe;

    // Fallback calculator for past dates if snapshot doesn't exist yet
    function calculateFromOrdersFallback(dateStr: string) {
      subscribeToOrders(restaurantId!, (allOrders) => {
        const todayOrders = allOrders.filter(o => o.orderDate === dateStr);

        const completedOrders = todayOrders.filter(
          o => o.status !== 'cancelled' && (o.status === 'completed' || o.status === 'served' || o.status === 'delivered' || o.paymentStatus === 'paid')
        );
        const todayRevenue = completedOrders.reduce((sum, o) => sum + (o.totalAmount || o.total || 0), 0);

        let pendingCount = 0;
        let preparingCount = 0;
        let readyCount = 0;
        let servedCount = 0;
        let outForDeliveryCount = 0;
        let deliveredCount = 0;
        let cancelledCount = 0;
        let dineInCount = 0;
        let deliveryCount = 0;

        todayOrders.forEach(o => {
          const status = o.status;
          if (status === 'pending') pendingCount++;
          else if (status === 'preparing') preparingCount++;
          else if (status === 'ready') readyCount++;
          else if (status === 'served' || status === 'completed') servedCount++;
          else if (status === 'out_for_delivery' || (status as any) === 'outForDelivery') outForDeliveryCount++;
          else if (status === 'delivered') deliveredCount++;
          else if (status === 'cancelled') cancelledCount++;

          if (status !== 'cancelled') {
            if (o.orderType === 'delivery') {
              deliveryCount++;
            } else {
              dineInCount++;
            }
          }
        });

        const validOrdersCount = todayOrders.filter(o => o.status !== 'cancelled').length;
        const averageOrderValue = validOrdersCount > 0 ? todayRevenue / validOrdersCount : 0;

        const itemQtyMap: Record<string, { name: string; qty: number }> = {};
        todayOrders.forEach(o => {
          if (o.status !== 'cancelled') {
            o.items.forEach(item => {
              const key = item.itemId;
              if (!itemQtyMap[key]) {
                itemQtyMap[key] = { name: item.name, qty: 0 };
              }
              itemQtyMap[key].qty += item.qty;
            });
          }
        });

        const topItems = Object.values(itemQtyMap)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);

        setMetrics({
          todayRevenue,
          todayOrdersCount: validOrdersCount,
          averageOrderValue,
          pendingCount,
          preparingCount,
          readyCount,
          servedCount,
          outForDeliveryCount,
          deliveredCount,
          cancelledCount,
          dineInCount,
          deliveryCount,
          topItems,
          recentOrders: allOrders.slice(0, 5)
        });
        setLoading(false);
      });
    }
  }, [restaurantId, selectedDateStr]);

  return { metrics, loading };
}
