import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  onSnapshot,
  writeBatch,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import type { Restaurant, Category, MenuItem, Table, Order, Rating, WaterRequest } from '../types';
import toast from 'react-hot-toast';

function toRestaurant(id: string, data: DocumentData): Restaurant {
  return { id, ...data } as Restaurant;
}

export async function getTableByNumber(restaurantId: string, tableNumber: string): Promise<Table | null> {
  const q = query(collection(db, 'restaurants', restaurantId, 'tables'), where('number', '==', tableNumber), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Table;
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toRestaurant(d.id, d.data());
}

// Real-time listener version of getRestaurantBySlug — used by customer pages
export function subscribeToRestaurantBySlug(
  slug: string,
  callback: (restaurant: Restaurant | null) => void
): () => void {
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      const d = snap.docs[0];
      callback(toRestaurant(d.id, d.data()));
    }
  }, (error) => {
    console.error('subscribeToRestaurantBySlug error:', error);
    callback(null);
  });
}

export function subscribeToRestaurantByCustomDomain(
  domain: string,
  callback: (restaurant: Restaurant | null) => void
): () => void {
  const q = query(collection(db, 'restaurants'), where('settings.customDomain', '==', domain), limit(1));
  return onSnapshot(q, (snap) => {
    if (snap.empty) {
      callback(null);
    } else {
      const d = snap.docs[0];
      callback(toRestaurant(d.id, d.data()));
    }
  }, (error) => {
    console.error('subscribeToRestaurantByCustomDomain error:', error);
    callback(null);
  });
}

export async function getRestaurantByOwnerId(uid: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('ownerId', '==', uid), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toRestaurant(d.id, d.data());
}

export async function updateRestaurant(id: string, data: Partial<Restaurant>): Promise<void> {
  await updateDoc(doc(db, 'restaurants', id), data as DocumentData);
}

export async function addCategory(restaurantId: string, data: Omit<Category, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'categories'), data);
  return ref.id;
}

export async function updateCategory(restaurantId: string, categoryId: string, data: Partial<Category>): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'categories', categoryId), data as DocumentData);
}

export async function deleteCategory(restaurantId: string, categoryId: string): Promise<void> {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'categories', categoryId));
}

export async function addMenuItem(restaurantId: string, data: Omit<MenuItem, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'items'), data);
  return ref.id;
}

export async function updateMenuItem(restaurantId: string, itemId: string, data: Partial<MenuItem>): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'items', itemId), data as DocumentData);
}

export async function deleteMenuItem(restaurantId: string, itemId: string): Promise<void> {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'items', itemId));
}
export async function deleteAllMenuItems(restaurantId: string): Promise<void> {
  const snap = await getDocs(collection(db, 'restaurants', restaurantId, 'items'));
  
  // Use a batch write for atomic deletion (handles up to 500 per batch)
  const batch = writeBatch(db);
  snap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
}

function generate4CharToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 4; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export async function addTable(restaurantId: string, data: Omit<Table, 'id'>): Promise<string> {
  const qrToken = data.qrToken ?? generate4CharToken();
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'tables'), { ...data, qrToken });
  return ref.id;
}

export async function updateTable(restaurantId: string, tableId: string, data: Partial<Table>): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'tables', tableId), data as DocumentData);
}

export async function deleteTable(restaurantId: string, tableId: string): Promise<void> {
  await deleteDoc(doc(db, 'restaurants', restaurantId, 'tables', tableId));
}

export async function getTableById(restaurantId: string, tableId: string): Promise<Table | null> {
  const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'tables', tableId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Table;
}

// NOTE: Client-side order creation removed. All orders must go through
// the `submitOrder` Cloud Function for server-side price verification.

export async function updateOrderStatus(restaurantId: string, orderId: string, status: Order['status']): Promise<void> {
  // Imports atomic status + analytics updater from analyticsDb
  const { updateOrderStatusAndAnalytics } = await import('./analyticsDb');
  await updateOrderStatusAndAnalytics(restaurantId, orderId, status);
}

export async function submitRating(restaurantId: string, data: Omit<Rating, 'id'>): Promise<string> {
  await setDoc(doc(db, 'restaurants', restaurantId, 'ratings', data.orderId), data);
  return data.orderId;
}

export async function verifyRating(restaurantId: string, ratingId: string): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'ratings', ratingId), {
    verified: true,
  });
}

export async function getTodaysOrders(restaurantId: string): Promise<Order[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const q = query(
    collection(db, 'restaurants', restaurantId, 'orders'),
    where('createdAt', '>=', Timestamp.fromDate(today)),
    orderBy('createdAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
}

export async function getOrder(restaurantId: string, orderId: string): Promise<Order | null> {
  const snap = await getDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Order;
}

export async function updateOrder(restaurantId: string, orderId: string, data: Partial<Order>): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), data as DocumentData);
}

export function subscribeToOrders(
  restaurantId: string,
  callback: (orders: Order[]) => void
) {
  // No server-side date filter here — newly placed orders use serverTimestamp()
  // which is null on the client until the server resolves it, causing them to
  // be excluded by a `where('createdAt', '>=', ...)` clause. Date filtering is
  // handled client-side in the Orders page UI (today / 7days / month tabs).
  const q = query(
    collection(db, 'restaurants', restaurantId, 'orders'),
    orderBy('createdAt', 'desc'),
    limit(200)
  );
  return onSnapshot(
    q,
    { includeMetadataChanges: false },
    snap => {
      const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      callback(orders);
    },
    error => {
      console.error("subscribeToOrders failed:", error);
      toast.error(`Order subscription failed: ${error.message}`);
    }
  );
}

export function subscribeToCategories(
  restaurantId: string,
  callback: (cats: Category[]) => void
) {
  const q = collection(db, 'restaurants', restaurantId, 'categories');
  return onSnapshot(q, snap => {
    const cats = snap.docs.map(d => ({ id: d.id, ...d.data() } as Category));
    cats.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(cats);
  });
}

export function subscribeToItems(
  restaurantId: string,
  callback: (items: MenuItem[]) => void
) {
  const q = collection(db, 'restaurants', restaurantId, 'items');
  return onSnapshot(q, snap => {
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as MenuItem));
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    callback(items);
  });
}

export function subscribeToTables(
  restaurantId: string,
  callback: (tables: Table[]) => void
) {
  return onSnapshot(collection(db, 'restaurants', restaurantId, 'tables'), snap => {
    const tables = snap.docs.map(d => ({ id: d.id, ...d.data() } as Table));
    tables.sort((a, b) => {
      const numA = a.number || '';
      const numB = b.number || '';
      return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
    });
    callback(tables);
  });
}

export function subscribeToRatings(
  restaurantId: string,
  callback: (ratings: Rating[]) => void
) {
  const q = collection(db, 'restaurants', restaurantId, 'ratings');
  return onSnapshot(q, snap => {
    const ratings = snap.docs.map(d => ({ id: d.id, ...d.data() } as Rating));
    ratings.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });
    callback(ratings);
  });
}

export async function createWaterRequest(
  restaurantId: string, 
  tableNumber: string, 
  qty: number, 
  type: 'water' | 'waiter' = 'water',
  ml?: number | string,
  price?: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'requests'), {
    tableNumber,
    qty,
    type,
    status: 'pending',
    createdAt: Timestamp.now(),
    ...(ml !== undefined ? { ml } : {}),
    ...(price !== undefined ? { price } : {}),
  });
  return ref.id;
}

export function subscribeToWaterRequests(
  restaurantId: string,
  callback: (reqs: WaterRequest[]) => void,
  statusFilter: 'pending' | 'completed' = 'pending'
) {
  const q = query(
    collection(db, 'restaurants', restaurantId, 'requests'),
    where('status', '==', statusFilter)
  );
  return onSnapshot(q, snap => {
    const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as WaterRequest));
    // Sort client-side (oldest first for active, newest first for completed)
    reqs.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return statusFilter === 'pending' ? timeA - timeB : timeB - timeA;
    });
    callback(reqs.slice(0, 50));
  });
}

export async function completeWaterRequest(restaurantId: string, requestId: string): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'requests', requestId), {
    status: 'completed',
  });
}

export async function verifyOrderPayment(
  restaurantId: string, 
  orderId: string, 
  sessionId?: string, 
  requestId?: string,
  paymentMethod?: 'cash' | 'upi'
): Promise<void> {
  const batch = writeBatch(db);
  
  const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);
  const updates: any = { paymentStatus: 'paid' };
  if (paymentMethod) {
    updates.paymentMethod = paymentMethod;
  }
  batch.update(orderRef, updates);

  let actualSessionId = sessionId;
  if (!actualSessionId) {
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      actualSessionId = orderSnap.data().sessionId;
    }
  }

  if (actualSessionId) {
    const sessionSnap = await getDoc(doc(db, 'sessions', actualSessionId));
    if (sessionSnap.exists()) {
      const sessionUpdates: any = { status: 'paid' };
      if (paymentMethod) {
        sessionUpdates.paymentMethod = paymentMethod;
      }
      batch.update(sessionSnap.ref, sessionUpdates);
    }
  }

  if (requestId) {
    batch.update(doc(db, 'restaurants', restaurantId, 'requests', requestId), { status: 'completed' });
  } else {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'requests'),
      where('type', '==', 'payment'),
      where('orderId', '==', orderId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      batch.update(snap.docs[0].ref, { status: 'completed' });
    }
  }

  await batch.commit();
}

export async function rejectOrderPayment(
  restaurantId: string,
  orderId: string,
  sessionId?: string,
  requestId?: string
): Promise<void> {
  const orderRef = doc(db, 'restaurants', restaurantId, 'orders', orderId);

  let actualSessionId = sessionId;
  if (!actualSessionId) {
    const orderSnap = await getDoc(orderRef);
    if (orderSnap.exists()) {
      actualSessionId = orderSnap.data().sessionId;
    }
  }

  const batch = writeBatch(db);

  // Reset order payment status so customer can try again
  batch.update(orderRef, { paymentStatus: 'unpaid' });

  // Reset session confirmation flag
  if (actualSessionId) {
    const sessionSnap = await getDoc(doc(db, 'sessions', actualSessionId));
    if (sessionSnap.exists()) {
      batch.update(sessionSnap.ref, {
        userConfirmedPayment: false
      });
    }
  }

  // Mark the payment request as completed (removes it from active list)
  if (requestId) {
    batch.update(doc(db, 'restaurants', restaurantId, 'requests', requestId), {
      status: 'completed'
    });
  } else {
    const q = query(
      collection(db, 'restaurants', restaurantId, 'requests'),
      where('type', '==', 'payment'),
      where('orderId', '==', orderId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const snap = await getDocs(q);
    if (!snap.empty) {
      batch.update(snap.docs[0].ref, { status: 'completed' });
    }
  }

  await batch.commit();
}

export async function createPaymentRequest(
  restaurantId: string,
  tableNumber: string,
  orderId: string,
  customerName: string,
  amount: number,
  dailyOrderId?: number
): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'requests'), {
    tableNumber,
    qty: 1,
    type: 'payment',
    status: 'pending',
    createdAt: Timestamp.now(),
    amount,
    orderId,
    customerName,
    ...(dailyOrderId !== undefined ? { dailyOrderId } : {})
  });
  return ref.id;
}
