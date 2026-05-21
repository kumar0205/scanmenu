import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  onSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './config';
import type { Restaurant, Category, MenuItem, Table, Order, Rating, WaterRequest } from '../types';

function toRestaurant(id: string, data: DocumentData): Restaurant {
  return { id, ...data } as Restaurant;
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('slug', '==', slug));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return toRestaurant(d.id, d.data());
}

export async function getRestaurantByOwnerId(uid: string): Promise<Restaurant | null> {
  const q = query(collection(db, 'restaurants'), where('ownerId', '==', uid));
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
  const promises = snap.docs.map(d => deleteDoc(doc(db, 'restaurants', restaurantId, 'items', d.id)));
  await Promise.all(promises);
}

export async function addTable(restaurantId: string, data: Omit<Table, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'tables'), data);
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

export async function createOrder(restaurantId: string, data: Omit<Order, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'orders'), data);
  return ref.id;
}

export async function updateOrderStatus(restaurantId: string, orderId: string, status: Order['status']): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', orderId), {
    status,
    updatedAt: Timestamp.now(),
  });
}

export async function submitRating(restaurantId: string, data: Omit<Rating, 'id'>): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'ratings'), data);
  return ref.id;
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
  const q = query(
    collection(db, 'restaurants', restaurantId, 'orders'),
    where('status', 'in', ['pending', 'preparing', 'ready'])
  );
  return onSnapshot(q, snap => {
    const orders = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
    orders.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });
    callback(orders);
  });
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
    tables.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true, sensitivity: 'base' }));
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

export async function createWaterRequest(restaurantId: string, tableNumber: string, qty: number, type: 'water' | 'waiter' = 'water'): Promise<string> {
  const ref = await addDoc(collection(db, 'restaurants', restaurantId, 'requests'), {
    tableNumber,
    qty,
    type,
    status: 'pending',
    createdAt: Timestamp.now(),
  });
  return ref.id;
}

export function subscribeToWaterRequests(
  restaurantId: string,
  callback: (reqs: WaterRequest[]) => void
) {
  const q = collection(db, 'restaurants', restaurantId, 'requests');
  return onSnapshot(q, snap => {
    const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as WaterRequest));
    reqs.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });
    callback(reqs);
  });
}

export async function completeWaterRequest(restaurantId: string, requestId: string): Promise<void> {
  await updateDoc(doc(db, 'restaurants', restaurantId, 'requests', requestId), {
    status: 'completed',
  });
}
