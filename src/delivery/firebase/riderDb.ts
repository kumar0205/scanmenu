import { 
  db 
} from '../../firebase/config';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  onSnapshot, 
  runTransaction, 
  Timestamp,
  getDocs,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import type { DeliveryBoy } from '../types';
import type { Order } from '../../types';

// Sync or initialize delivery boy profile
export async function syncRiderProfile(uid: string, defaultName: string, defaultPhone: string): Promise<DeliveryBoy> {
  const docRef = doc(db, 'deliveryBoys', uid);
  const snap = await getDoc(docRef);
  
  if (snap.exists()) {
    return { uid, ...snap.data() } as DeliveryBoy;
  }
  
  const newRider: DeliveryBoy = {
    uid,
    name: defaultName || 'Rider',
    phone: defaultPhone || '',
    vehicle: 'Bike',
    vehicleNumber: '',
    isOnline: false,
    totalDeliveries: 0,
    totalEarnings: 0,
    createdAt: Timestamp.now(),
    currentTown: '',
    totalCompletedOrders: 0,
    totalCashCollected: 0,
    totalUpiCollected: 0,
    unsettledCash: 0,
    unsettledUpi: 0,
    activeOrderIds: [],
    lastSettledAt: null as any
  };
  
  await setDoc(docRef, newRider);
  
  // Also ensure the user doc exists in the /users collection with role 'rider'
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    await setDoc(userRef, {
      email: '',
      displayName: defaultName || 'Rider',
      role: 'rider',
      createdAt: Timestamp.now()
    }, { merge: true });
  } else if (userSnap.data().role !== 'rider') {
    await updateDoc(userRef, { role: 'rider' });
  }
  
  return newRider;
}

// Update online status
export async function updateRiderOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  const docRef = doc(db, 'deliveryBoys', uid);
  await updateDoc(docRef, { isOnline });
}

// Update rider profile info
export async function updateRiderProfile(uid: string, data: Partial<DeliveryBoy>): Promise<void> {
  const docRef = doc(db, 'deliveryBoys', uid);
  await updateDoc(docRef, data);
}

// Subscribe to rider profile updates
export function subscribeToRiderProfile(uid: string, callback: (rider: DeliveryBoy | null) => void) {
  return onSnapshot(doc(db, 'deliveryBoys', uid), (snap) => {
    if (snap.exists()) {
      callback({ uid, ...snap.data() } as DeliveryBoy);
    } else {
      callback(null);
    }
  }, (err) => {
    console.error('Error subscribing to rider profile:', err);
  });
}

// Subscribe to all delivery orders that are ready and unassigned
export function subscribeToAvailableOrders(restaurantId: string | null, callback: (orders: Order[]) => void) {
  if (restaurantId) {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'orders'),
      where('orderType', '==', 'delivery'),
      where('status', '==', 'ready')
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, restaurantId, ...d.data() } as Order & { restaurantId: string }));
      const unassigned = list.filter(o => !o.assignedRiderId);
      callback(unassigned);
    }, (err) => {
      console.error('Error subscribing to available orders:', err);
      callback([]);
    });
  }

  // If no restaurantId, we subscribe to all restaurants
  let unsubRestaurants: (() => void) | null = null;
  const unsubsMap = new Map<string, () => void>();
  const allOrdersMap = new Map<string, Order[]>();

  const triggerCallback = () => {
    const allOrders: Order[] = [];
    allOrdersMap.forEach((orders) => {
      allOrders.push(...orders);
    });
    // Filter unassigned
    const unassigned = allOrders.filter(o => !o.assignedRiderId);
    callback(unassigned);
  };

  // Listen to restaurants list
  unsubRestaurants = onSnapshot(collection(db, 'restaurants'), (restaurantsSnap) => {
    const currentIds = restaurantsSnap.docs.map(d => d.id);
    
    // Remove listeners for restaurants that are no longer present
    unsubsMap.forEach((unsub, id) => {
      if (!currentIds.includes(id)) {
        unsub();
        unsubsMap.delete(id);
        allOrdersMap.delete(id);
      }
    });

    // Add listeners for new restaurants
    currentIds.forEach((rId) => {
      if (unsubsMap.has(rId)) return;

      const q = query(
        collection(db, 'restaurants', rId, 'orders'),
        where('orderType', '==', 'delivery'),
        where('status', '==', 'ready')
      );

      const unsub = onSnapshot(q, (ordersSnap) => {
        const list = ordersSnap.docs.map(d => ({ id: d.id, restaurantId: rId, ...d.data() } as Order & { restaurantId: string }));
        allOrdersMap.set(rId, list);
        triggerCallback();
      }, (err) => {
        console.error(`Error subscribing to orders for restaurant ${rId}:`, err);
      });

      unsubsMap.set(rId, unsub);
    });
  }, (err) => {
    console.error('Error subscribing to restaurants list:', err);
  });

  return () => {
    if (unsubRestaurants) unsubRestaurants();
    unsubsMap.forEach(unsub => unsub());
  };
}

// Subscribe to a rider's active and completed orders
export function subscribeToRiderOrders(restaurantId: string | null, riderUid: string, callback: (orders: Order[]) => void) {
  if (restaurantId) {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'orders'),
      where('orderType', '==', 'delivery'),
      where('assignedRiderId', '==', riderUid)
    );
    return onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, restaurantId, ...d.data() } as Order & { restaurantId: string }));
      callback(list);
    }, (err) => {
      console.error('Error subscribing to rider orders:', err);
      callback([]);
    });
  }

  // If no restaurantId, we subscribe to all restaurants
  let unsubRestaurants: (() => void) | null = null;
  const unsubsMap = new Map<string, () => void>();
  const allOrdersMap = new Map<string, Order[]>();

  const triggerCallback = () => {
    const allOrders: Order[] = [];
    allOrdersMap.forEach((orders) => {
      allOrders.push(...orders);
    });
    callback(allOrders);
  };

  // Listen to restaurants list
  unsubRestaurants = onSnapshot(collection(db, 'restaurants'), (restaurantsSnap) => {
    const currentIds = restaurantsSnap.docs.map(d => d.id);
    
    // Remove listeners for restaurants that are no longer present
    unsubsMap.forEach((unsub, id) => {
      if (!currentIds.includes(id)) {
        unsub();
        unsubsMap.delete(id);
        allOrdersMap.delete(id);
      }
    });

    // Add listeners for new restaurants
    currentIds.forEach((rId) => {
      if (unsubsMap.has(rId)) return;

      const q = query(
        collection(db, 'restaurants', rId, 'orders'),
        where('orderType', '==', 'delivery'),
        where('assignedRiderId', '==', riderUid)
      );

      const unsub = onSnapshot(q, (ordersSnap) => {
        const list = ordersSnap.docs.map(d => ({ id: d.id, restaurantId: rId, ...d.data() } as Order & { restaurantId: string }));
        allOrdersMap.set(rId, list);
        triggerCallback();
      }, (err) => {
        console.error(`Error subscribing to rider orders for restaurant ${rId}:`, err);
      });

      unsubsMap.set(rId, unsub);
    });
  }, (err) => {
    console.error('Error subscribing to restaurants list:', err);
  });

  return () => {
    if (unsubRestaurants) unsubRestaurants();
    unsubsMap.forEach(unsub => unsub());
  };
}

// Transaction for accepting a delivery order
export async function acceptDeliveryOrder(restaurantId: string, orderId: string, riderUid: string): Promise<void> {
  const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
  const riderRef = doc(db, 'deliveryBoys', riderUid);

  await runTransaction(db, async (transaction) => {
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists()) {
      throw new Error('Order not found');
    }
    
    const orderData = orderSnap.data();
    if (orderData.assignedRiderId) {
      throw new Error('This order was accepted by another rider.');
    }
    if (orderData.status !== 'ready') {
      throw new Error('This order is no longer ready for pickup.');
    }

    const riderSnap = await transaction.get(riderRef);
    const riderName = riderSnap.exists() ? (riderSnap.data()?.name || 'Rider') : 'Rider';

    const payout = orderData.deliveryFee || 30;

    // Update the order doc with top-level and rider-map details
    transaction.update(orderRef, {
      assignedRiderId: riderUid,
      assignedRiderName: riderName,
      rider: {
        id: riderUid,
        name: riderName,
        earning: payout,
        settled: false,
        settlementId: null
      },
      status: 'out_for_delivery',
      'timeline.pickedUpAt': Timestamp.now(),
      riderAssignedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });

    // Track active delivery order on rider profile
    transaction.update(riderRef, {
      currentOrderId: orderId,
      activeOrderIds: arrayUnion(orderId)
    });
  });
}

// Update order status (pickedUp, out_for_delivery, delivered)
export async function updateDeliveryStatus(
  restaurantId: string, 
  orderId: string, 
  status: 'out_for_delivery' | 'delivered', 
  riderUid: string,
  deliveryFee: number = 0,
  paymentMethod?: 'cash' | 'upi'
): Promise<void> {
  const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
  const updates: any = {
    status,
    updatedAt: Timestamp.now()
  };

  const payout = deliveryFee || 30;

  if (status === 'out_for_delivery') {
    updates['timeline.pickedUpAt'] = Timestamp.now();
  } else if (status === 'delivered') {
    updates['timeline.deliveredAt'] = Timestamp.now();
    updates.paymentStatus = 'paid'; // Mark as paid upon delivery completion
    if (paymentMethod) {
      updates.paymentMethod = paymentMethod;
      updates.paymentReceivedBy = 'rider'; // Both Cash and UPI collections are held by the rider bank/hand
    }
    updates['rider.earning'] = payout;
  }

  await updateDoc(orderRef, updates);

  // If successfully marked delivered, update rider metrics
  if (status === 'delivered') {
    const riderRef = doc(db, 'deliveryBoys', riderUid);
    
    // Fetch the order data first to get totalAmount and paymentMethod
    const orderSnap = await getDoc(orderRef);
    const orderData = orderSnap.exists() ? orderSnap.data() : null;
    const orderAmount = orderData?.totalAmount || 0;
    const actualPaymentMethod = paymentMethod || orderData?.paymentMethod || 'cash';

    await runTransaction(db, async (transaction) => {
      const riderSnap = await transaction.get(riderRef);
      if (riderSnap.exists()) {
        const currentData = riderSnap.data();
        const unsettledCashAdd = actualPaymentMethod === 'cash' ? orderAmount : 0;
        const unsettledUpiAdd = actualPaymentMethod === 'upi' ? orderAmount : 0;

        transaction.update(riderRef, {
          totalDeliveries: (currentData.totalDeliveries || 0) + 1,
          totalEarnings: (currentData.totalEarnings || 0) + payout,
          pendingPayout: (currentData.pendingPayout || 0) + payout,
          currentOrderId: null,
          totalCompletedOrders: (currentData.totalCompletedOrders || 0) + 1,
          unsettledCash: (currentData.unsettledCash || 0) + unsettledCashAdd,
          unsettledUpi: (currentData.unsettledUpi || 0) + unsettledUpiAdd,
          activeOrderIds: arrayRemove(orderId)
        });
      }
    });
  }
}

// Transaction function for recording settlement of payments to riders (Simplified Version)
export async function recordRiderSettlement(
  riderId: string,
  restaurantId: string,
  cashCollected: number,
  upiCollected: number,
  deliveryEarnings: number,
  netReturned: number,
  method: string,
  reference: string,
  ownerId: string
): Promise<void> {
  const riderRef = doc(db, 'deliveryBoys', riderId);
  
  // Get all completed, unpaid, and unsettled orders for this rider
  const ordersQuery = query(
    collection(db, 'restaurants', restaurantId, 'orders'),
    where('orderType', '==', 'delivery'),
    where('status', '==', 'delivered'),
    where('rider.id', '==', riderId),
    where('rider.settled', '==', false)
  );
  
  const querySnap = await getDocs(ordersQuery);
  const orderDocs = querySnap.docs;
  const orderIds = orderDocs.map(d => d.id);

  await runTransaction(db, async (transaction) => {
    const riderSnap = await transaction.get(riderRef);
    if (!riderSnap.exists()) {
      throw new Error('Rider profile not found');
    }
    const riderData = riderSnap.data();

    // Create a new settlement document with automatic ID
    const newSettlementRef = doc(collection(db, 'settlements'));
    const settlementId = newSettlementRef.id;

    const paidAt = Timestamp.now();
    transaction.set(newSettlementRef, {
      riderId,
      restaurantId,
      cashCollected,
      upiCollected,
      collectedAt: paidAt,
      orderIds,
      method,
      reference,
      paidBy: ownerId,
      netReturned
    });

    const currentTotalCash = riderData.totalCashCollected || 0;
    const currentTotalUpi = riderData.totalUpiCollected || 0;

    // Reset unsettled, add to lifetime, set last settled time
    transaction.update(riderRef, {
      unsettledCash: 0,
      unsettledUpi: 0,
      totalCashCollected: currentTotalCash + cashCollected,
      totalUpiCollected: currentTotalUpi + upiCollected,
      lastSettledAt: paidAt,
      
      // also keep updating legacy fields just in case
      pendingPayout: 0,
      paidAmount: (riderData.paidAmount || 0) + deliveryEarnings
    });

    // Update all the affected orders to be settled
    for (const orderDoc of orderDocs) {
      const orderRef = orderDoc.ref;
      transaction.update(orderRef, {
        'rider.settled': true,
        'rider.settlementId': settlementId,
        'rider.settledAt': paidAt
      });
    }
  });
}

// Fetch single restaurant by ID (for logos, names, etc.)
export async function getRestaurantDetails(restaurantId: string) {
  const docRef = doc(db, 'restaurants', restaurantId);
  const snap = await getDoc(docRef);
  return snap.exists() ? snap.data() : null;
}
