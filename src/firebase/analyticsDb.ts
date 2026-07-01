import {
  doc,
  getDoc,
  getDocs,
  writeBatch,
  Timestamp,
  increment,
  collection,
  query,
  where,
  limit,
  arrayRemove
} from 'firebase/firestore';
import { db } from './config';
import type { Order, DayAnalytics, MonthAnalytics } from '../types';

/**
 * Fetch daily analytics for a single day.
 * Returns null if document doesn't exist.
 */
export async function fetchDayAnalytics(restaurantId: string, dateStr: string): Promise<DayAnalytics | null> {
  const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'analytics', dateStr));
  if (!snap.exists()) return null;
  return snap.data() as DayAnalytics;
}

/**
 * Fetch daily analytics for a list of dates (e.g. last 7 days).
 */
export async function fetchWeekAnalytics(restaurantId: string, dates: string[]): Promise<DayAnalytics[]> {
  const promises = dates.map(date => getDoc(doc(db, 'restaurants', restaurantId, 'analytics', date)));
  const snaps = await Promise.all(promises);
  return snaps
    .filter(snap => snap.exists())
    .map(snap => snap.data() as DayAnalytics);
}

/**
 * Fetch monthly analytics rollup document.
 * If not found, falls back to reading daily documents for that month.
 */
export async function fetchMonthAnalytics(restaurantId: string, monthStr: string): Promise<MonthAnalytics | null> {
  const monthlyDocRef = doc(db, 'restaurants', restaurantId, 'analyticsMonthly', monthStr);
  const monthlySnap = await getDoc(monthlyDocRef);
  
  if (monthlySnap.exists()) {
    return monthlySnap.data() as MonthAnalytics;
  }

  // Fallback: Read daily documents of that month (maximum 31 reads)
  // Fetch daily collection
  const colRef = collection(db, 'restaurants', restaurantId, 'analytics');
  // Date range query to only fetch docs matching this month YYYY-MM
  const q = query(
    colRef,
    where('date', '>=', `${monthStr}-01`),
    where('date', '<=', `${monthStr}-31`),
    limit(31)
  );
  
  const snaps = await getDocs(q);
  if (snaps.empty) return null;

  const dailyDocs = snaps.docs.map(d => d.data() as DayAnalytics);
  
  // Aggregate daily docs client-side into a single MonthAnalytics object
  let totalRevenue = 0;
  let totalOrders = 0;
  const topItems: Record<string, number> = {};
  const topItemsRevenue: Record<string, number> = {};
  const categoryRevenue: Record<string, number> = {};
  const dailyRevenueTrend: Record<string, number> = {};
  
  let bestDay = '';
  let highestRevenueDay = 0;

  const weekdayRevenue: Record<string, number> = {};
  const weekdayCounts: Record<string, number> = {};

  let itemsCountSum = 0;
  let repeatCustomers = 0;
  let highestSingleOrder = 0;
  const hourlyRevenue: Record<string, number> = {};

  dailyDocs.forEach(doc => {
    totalRevenue += doc.totalRevenue || 0;
    totalOrders += doc.totalOrders || 0;
    dailyRevenueTrend[doc.date] = doc.totalRevenue || 0;
    
    // Items count sum and repeat customers
    itemsCountSum += doc.itemsCountSum || 0;
    repeatCustomers += doc.repeatCustomers || 0;

    // Highest single order
    if ((doc.highestSingleOrder || 0) > highestSingleOrder) {
      highestSingleOrder = doc.highestSingleOrder;
    }

    // Hourly revenue
    if (doc.hourlyRevenue) {
      Object.entries(doc.hourlyRevenue).forEach(([h, rev]) => {
        hourlyRevenue[h] = (hourlyRevenue[h] || 0) + rev;
      });
    }

    // Top items
    Object.keys(doc.topItems || {}).forEach(name => {
      topItems[name] = (topItems[name] || 0) + doc.topItems[name];
    });

    // Top items revenue
    Object.keys(doc.topItemsRevenue || {}).forEach(name => {
      topItemsRevenue[name] = (topItemsRevenue[name] || 0) + (doc.topItemsRevenue?.[name] || 0);
    });

    // Category Revenue
    Object.keys(doc.categoryRevenue || {}).forEach(cat => {
      categoryRevenue[cat] = (categoryRevenue[cat] || 0) + doc.categoryRevenue[cat];
    });

    // Weekdays
    const dayOfWeek = doc.dayOfWeek;
    if (dayOfWeek) {
      weekdayRevenue[dayOfWeek] = (weekdayRevenue[dayOfWeek] || 0) + (doc.totalRevenue || 0);
      weekdayCounts[dayOfWeek] = (weekdayCounts[dayOfWeek] || 0) + 1;
    }

    // Best day
    if ((doc.totalRevenue || 0) > highestRevenueDay) {
      highestRevenueDay = doc.totalRevenue || 0;
      bestDay = doc.date;
    }
  });

  const weekdayAverages: Record<string, number> = {};
  ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].forEach(d => {
    const sum = weekdayRevenue[d] || 0;
    const count = weekdayCounts[d] || 1;
    weekdayAverages[d] = Math.round(sum / count);
  });

  const averageItemsPerOrder = totalOrders > 0 ? Math.round((itemsCountSum / totalOrders) * 10) / 10 : 0;
  let bestHour = '--';
  let maxHourlyRev = 0;
  Object.entries(hourlyRevenue).forEach(([h, rev]) => {
    if (rev > maxHourlyRev) {
      maxHourlyRev = rev;
      bestHour = h + ':00';
    }
  });

  return {
    month: monthStr,
    daysElapsed: dailyDocs.length,
    totalRevenue,
    totalOrders,
    topItems,
    topItemsRevenue,
    categoryRevenue,
    weekdayAverages,
    bestDay,
    highestRevenueDay,
    dailyRevenueTrend,
    lastUpdated: dailyDocs.length > 0 ? dailyDocs[dailyDocs.length - 1].date : monthStr,
    averageItemsPerOrder,
    repeatCustomers,
    highestSingleOrder,
    bestHour,
    itemsCountSum,
    hourlyRevenue
  };
}

/**
 * Safe helper to convert any Firestore/JS timestamp representation into a JS Date.
 */
function parseTimestamp(timestamp: any): Date {
  if (!timestamp) return new Date();
  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  if (typeof timestamp.toMillis === 'function') {
    return new Date(timestamp.toMillis());
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }
  if (typeof timestamp === 'object') {
    const sec = timestamp.seconds ?? timestamp._seconds;
    const nanosec = timestamp.nanoseconds ?? timestamp._nanoseconds ?? 0;
    if (typeof sec === 'number') {
      return new Date(sec * 1000 + nanosec / 1000000);
    }
  }
  return new Date();
}

/**
 * Atomic status and analytics updater.
 * Performs status update and daily/monthly rollup calculations in a single atomic batch commit.
 */
export async function updateOrderStatusAndAnalytics(
  restaurantId: string,
  orderId: string,
  status: Order['status']
): Promise<void> {
  const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
  
  const timelineFieldMap: Record<string, string> = {
    accepted: 'timeline.acceptedAt',
    preparing: 'timeline.preparingAt',
    ready: 'timeline.readyAt',
    out_for_delivery: 'timeline.pickedUpAt',
    delivered: 'timeline.deliveredAt',
    served: 'timeline.deliveredAt'
  };

  if (status !== 'completed' && status !== 'served' && status !== 'delivered') {
    // Standard status update
    const batch = writeBatch(db);
    const updatePayload: any = {
      status,
      updatedAt: Timestamp.now()
    };
    if (timelineFieldMap[status]) {
      updatePayload[timelineFieldMap[status]] = Timestamp.now();
    }
    batch.update(orderRef, updatePayload);

    if (status === 'cancelled') {
      const orderSnap = await getDoc(orderRef);
      if (orderSnap.exists()) {
        const orderData = orderSnap.data();
        if (orderData.assignedRiderId) {
          const riderRef = doc(db, 'deliveryBoys', orderData.assignedRiderId);
          batch.update(riderRef, { 
            currentOrderId: null,
            activeOrderIds: arrayRemove(orderId)
          });
        }
      }
    }

    await batch.commit();
    return;
  }

  // If status is terminal, perform atomic update
  const orderSnap = await getDoc(orderRef);
  if (!orderSnap.exists()) {
    throw new Error(`Order ${orderId} not found`);
  }
  const order = { id: orderSnap.id, ...orderSnap.data() } as Order;

  // Analytics race condition guard: If order is already completed, do not re-run rollups
  if (order.status === 'completed' || order.status === 'served' || order.status === 'delivered') {
    return;
  }

  // Calculate IST Date
  const dateObj = parseTimestamp(order.createdAt);
  const istTime = new Date(dateObj.getTime() + (330 * 60000));
  const YYYY_MM_DD = istTime.toISOString().split('T')[0];
  const YYYY_MM = YYYY_MM_DD.slice(0, 7);
  const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const dayOfWeekStr = days[istTime.getUTCDay()];
  const hourStr = String(istTime.getUTCHours()).padStart(2, '0');

  const dailyRef = doc(db, 'restaurants', restaurantId, 'analytics', YYYY_MM_DD);
  const monthlyRef = doc(db, 'restaurants', restaurantId, 'analyticsMonthly', YYYY_MM);

  const customerId = order.customerId;
  const customerRef = (typeof customerId === 'string' && customerId.trim() !== '')
    ? doc(db, 'restaurants', restaurantId, 'customers', customerId.trim())
    : null;

  const [dailySnap, monthlySnap, customerSnap] = await Promise.all([
    getDoc(dailyRef),
    getDoc(monthlyRef),
    customerRef ? getDoc(customerRef) : Promise.resolve(null)
  ]);

  const batch = writeBatch(db);

  // 1. Update order status
  const updatePayloadTerminal: any = {
    status,
    updatedAt: Timestamp.now()
  };
  if (timelineFieldMap[status]) {
    updatePayloadTerminal[timelineFieldMap[status]] = Timestamp.now();
  }
  batch.update(orderRef, updatePayloadTerminal);

  // Track customer profile for repeat customer analytics
  let isRepeatCustomer = false;
  if (customerRef && customerSnap) {
    isRepeatCustomer = customerSnap.exists();
    if (isRepeatCustomer) {
      batch.update(customerRef, {
        completedOrdersCount: increment(1),
        lastOrderDate: YYYY_MM_DD,
        updatedAt: Timestamp.now()
      });
    } else {
      batch.set(customerRef, {
        completedOrdersCount: 1,
        createdAt: Timestamp.now(),
        lastOrderDate: YYYY_MM_DD,
        customerName: order.customerName || 'User'
      });
    }
  }

  const orderItems = order.items || [];
  const orderItemsCount = orderItems.reduce((sum, item) => sum + (typeof item.qty === 'number' ? item.qty : 1), 0);
  const totalAmount = typeof order.totalAmount === 'number' ? order.totalAmount : 0;

  // 2. Prepare Daily Analytics using structured nested maps
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dailyData: any = {
    date: YYYY_MM_DD,
    dayOfWeek: dayOfWeekStr,
    totalOrders: increment(1),
    completedOrders: increment(1),
    totalRevenue: increment(totalAmount),
    hourlyRevenue: {
      [hourStr]: increment(totalAmount)
    },
    itemsCountSum: increment(orderItemsCount),
    insights: []
  };

  const dailyTopItems: Record<string, any> = {};
  const dailyTopItemsRevenue: Record<string, any> = {};
  const dailyCategoryRevenue: Record<string, any> = {};
  const dailyCategoryItems: Record<string, any> = {};

  // Merge items and categories
  orderItems.forEach(item => {
    // Escape dots in item/category names for Firestore field paths
    const itemName = (item.name || 'Unknown Item').replace(/\./g, '_');
    const catName = (item.categoryName || 'Uncategorized').replace(/\./g, '_');
    const qty = typeof item.qty === 'number' ? item.qty : 1;
    const price = typeof item.price === 'number' ? item.price : 0;

    dailyTopItems[itemName] = increment(qty);
    dailyTopItemsRevenue[itemName] = increment(price * qty);
    dailyCategoryRevenue[catName] = increment(price * qty);
    dailyCategoryItems[catName] = increment(qty);
  });

  if (Object.keys(dailyTopItems).length > 0) dailyData.topItems = dailyTopItems;
  if (Object.keys(dailyTopItemsRevenue).length > 0) dailyData.topItemsRevenue = dailyTopItemsRevenue;
  if (Object.keys(dailyCategoryRevenue).length > 0) dailyData.categoryRevenue = dailyCategoryRevenue;
  if (Object.keys(dailyCategoryItems).length > 0) dailyData.categoryItems = dailyCategoryItems;

  // Determine running average, highest single order, peak hour, best item
  let newHighestSingleOrder = totalAmount;
  let newPeakHour = hourStr + ':00';
  let newBestSellingItem = orderItems.length > 0 ? (orderItems[0].name || '') : '';
  let newDailyItemsCountSum = orderItemsCount;
  let newDailyCompletedOrders = 1;
  let newDailyRepeatCustomers = isRepeatCustomer ? 1 : 0;

  if (dailySnap.exists()) {
    const existing = dailySnap.data();
    
    // Highest single order calculation
    newHighestSingleOrder = Math.max(existing.highestSingleOrder || 0, totalAmount);

    // Peak hour calculation
    const currentHourly = { ...(existing.hourlyRevenue || {}) };
    currentHourly[hourStr] = (currentHourly[hourStr] || 0) + totalAmount;
    let maxRev = 0;
    Object.keys(currentHourly).forEach(h => {
      if (currentHourly[h] > maxRev) {
        maxRev = currentHourly[h];
        newPeakHour = h + ':00';
      }
    });

    // Best selling item calculation
    const currentTop = { ...(existing.topItems || {}) };
    orderItems.forEach(item => {
      const escapedName = (item.name || 'Unknown Item').replace(/\./g, '_');
      const qty = typeof item.qty === 'number' ? item.qty : 1;
      currentTop[escapedName] = (currentTop[escapedName] || 0) + qty;
    });
    let maxQty = 0;
    Object.keys(currentTop).forEach(name => {
      if (currentTop[name] > maxQty) {
        maxQty = currentTop[name];
        newBestSellingItem = name.replace(/_/g, '.');
      }
    });

    newDailyItemsCountSum += (existing.itemsCountSum || 0);
    newDailyCompletedOrders += (existing.completedOrders || 0);
    newDailyRepeatCustomers += (existing.repeatCustomers || 0);
  }

  dailyData.highestSingleOrder = newHighestSingleOrder;
  dailyData.peakHour = newPeakHour;
  dailyData.bestHour = newPeakHour;
  dailyData.bestSellingItem = newBestSellingItem;
  dailyData.averageItemsPerOrder = Math.round((newDailyItemsCountSum / newDailyCompletedOrders) * 10) / 10;
  dailyData.repeatCustomers = newDailyRepeatCustomers;

  batch.set(dailyRef, dailyData, { merge: true });

  // 3. Prepare Monthly Rollup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monthlyData: any = {
    month: YYYY_MM,
    totalOrders: increment(1),
    totalRevenue: increment(totalAmount),
    dailyRevenueTrend: {
      [YYYY_MM_DD]: increment(totalAmount)
    },
    lastUpdated: YYYY_MM_DD,
    hourlyRevenue: {
      [hourStr]: increment(totalAmount)
    }
  };

  const monthlyTopItems: Record<string, any> = {};
  const monthlyTopItemsRevenue: Record<string, any> = {};
  const monthlyCategoryRevenue: Record<string, any> = {};

  // Merge Monthly Top Items & Category Revenue
  orderItems.forEach(item => {
    const itemName = (item.name || 'Unknown Item').replace(/\./g, '_');
    const catName = (item.categoryName || 'Uncategorized').replace(/\./g, '_');
    const qty = typeof item.qty === 'number' ? item.qty : 1;
    const price = typeof item.price === 'number' ? item.price : 0;

    monthlyTopItems[itemName] = increment(qty);
    monthlyTopItemsRevenue[itemName] = increment(price * qty);
    monthlyCategoryRevenue[catName] = increment(price * qty);
  });

  if (Object.keys(monthlyTopItems).length > 0) monthlyData.topItems = monthlyTopItems;
  if (Object.keys(monthlyTopItemsRevenue).length > 0) monthlyData.topItemsRevenue = monthlyTopItemsRevenue;
  if (Object.keys(monthlyCategoryRevenue).length > 0) monthlyData.categoryRevenue = monthlyCategoryRevenue;

  // Track itemsCountSum and repeatCustomers in monthly rollup
  monthlyData.itemsCountSum = increment(orderItemsCount);

  let monthlyHighestSingleOrder = totalAmount;
  let monthlyBestHour = hourStr + ':00';
  let newMonthlyItemsCountSum = orderItemsCount;
  let newMonthlyOrdersCount = 1;
  let newMonthlyRepeatCustomers = isRepeatCustomer ? 1 : 0;

  if (monthlySnap.exists()) {
    const existingMonthly = monthlySnap.data();

    // Highest single order calculation
    monthlyHighestSingleOrder = Math.max(existingMonthly.highestSingleOrder || 0, totalAmount);

    // Peak hour calculation
    const currentHourly = { ...(existingMonthly.hourlyRevenue || {}) };
    currentHourly[hourStr] = (currentHourly[hourStr] || 0) + totalAmount;
    let maxRev = 0;
    Object.keys(currentHourly).forEach(h => {
      if (currentHourly[h] > maxRev) {
        maxRev = currentHourly[h];
        monthlyBestHour = h + ':00';
      }
    });

    newMonthlyItemsCountSum += (existingMonthly.itemsCountSum || 0);
    newMonthlyOrdersCount += (existingMonthly.totalOrders || 0);
    newMonthlyRepeatCustomers += (existingMonthly.repeatCustomers || 0);
  }

  monthlyData.highestSingleOrder = monthlyHighestSingleOrder;
  monthlyData.bestHour = monthlyBestHour;
  monthlyData.peakHour = monthlyBestHour;
  monthlyData.averageItemsPerOrder = Math.round((newMonthlyItemsCountSum / newMonthlyOrdersCount) * 10) / 10;
  monthlyData.repeatCustomers = newMonthlyRepeatCustomers;

  // Weekday Averages Calculation
  const uniqueDates = monthlySnap.exists() ? (monthlySnap.data().uniqueDates || []) : [];
  if (!uniqueDates.includes(YYYY_MM_DD)) {
    uniqueDates.push(YYYY_MM_DD);
  }
  monthlyData.uniqueDates = uniqueDates;
  monthlyData.daysElapsed = uniqueDates.length;

  const weekdayRevenue = monthlySnap.exists() ? { ...(monthlySnap.data().weekdayRevenue || {}) } : {};
  weekdayRevenue[dayOfWeekStr] = (weekdayRevenue[dayOfWeekStr] || 0) + totalAmount;
  
  monthlyData.weekdayRevenue = {
    [dayOfWeekStr]: increment(totalAmount)
  };

  const weekdayCounts = monthlySnap.exists() ? { ...(monthlySnap.data().weekdayCounts || {}) } : {};
  if (!monthlySnap.exists() || !monthlySnap.data().uniqueDates?.includes(YYYY_MM_DD)) {
    weekdayCounts[dayOfWeekStr] = (weekdayCounts[dayOfWeekStr] || 0) + 1;
    monthlyData.weekdayCounts = {
      [dayOfWeekStr]: increment(1)
    };
  }

  // Recalculate weekday averages
  const weekdayAverages: Record<string, number> = {};
  days.forEach(d => {
    const sum = weekdayRevenue[d] || 0;
    const count = weekdayCounts[d] || 1;
    weekdayAverages[d] = Math.round(sum / count);
  });
  monthlyData.weekdayAverages = weekdayAverages;

  // Best Day and Highest Revenue Day (bestDayRevenue)
  let newHighestRevenueDay = totalAmount;
  let newBestDay = YYYY_MM_DD;

  if (monthlySnap.exists()) {
    const existingMonthly = monthlySnap.data();
    newHighestRevenueDay = existingMonthly.highestRevenueDay || 0;
    newBestDay = existingMonthly.bestDay || '';

    // Calculate today's total revenue including the new order
    let todayCurrentRevenue = 0;
    if (dailySnap.exists()) {
      todayCurrentRevenue = dailySnap.data()?.totalRevenue || 0;
    }
    const todayTotalRevenue = todayCurrentRevenue + totalAmount;
    
    if (todayTotalRevenue > newHighestRevenueDay) {
      newHighestRevenueDay = todayTotalRevenue;
      newBestDay = YYYY_MM_DD;
    }
  }

  monthlyData.highestRevenueDay = newHighestRevenueDay;
  monthlyData.bestDay = newBestDay;

  // Set with merge: true inside the batch
  batch.set(monthlyRef, monthlyData, { merge: true });

  // Commit atomically
  await batch.commit();
}
