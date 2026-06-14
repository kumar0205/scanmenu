import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  sendPasswordResetEmail,
  type User,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { getRestaurantBySlug, addTable, addCategory, addMenuItem } from './db';
import { generateSlug } from '../utils/formatters';

export async function signInAnonymouslyUser() {
  return firebaseSignInAnonymously(auth);
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string) {
  return createUserWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
}

export async function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function registerRestaurant(data: {
  restaurantName: string;
  email: string;
  password: string;
  phone: string;
  address: string;
}) {
  const restaurantName = data.restaurantName.trim();
  const email = data.email.trim().toLowerCase();
  const cred = await createUserWithEmailAndPassword(auth, email, data.password);
  const uid = cred.user.uid;

  let slug = generateSlug(restaurantName);
  const existing = await getRestaurantBySlug(slug);
  if (existing) {
    slug = slug + '-' + Math.floor(100 + Math.random() * 900).toString();
  }

  const restaurant = {
    name: restaurantName,
    slug,
    logoUrl: '',
    phone: data.phone,
    address: data.address,
    currency: '₹',
    googleReviewUrl: '',
    rewards: {
      active: false,
      discountPercent: 10,
      discountLabel: '10% Off',
      dessertLabel: 'Free Dessert',
      dessertDescription: 'On next order',
    },
    waterBottle: {
      enabled: false,
      price: 20,
      ml: 1000,
      options: [
        { id: '500ml', ml: '500ml', price: 20 },
        { id: '1l', ml: '1L', price: 30 },
        { id: '2l', ml: '2L', price: 45 }
      ]
    },
    callWaiter: {
      enabled: false,
    },
    plan: 'free' as const,
    ownerId: uid,
    createdAt: Timestamp.now(),
  };

  await setDoc(doc(db, 'restaurants', uid), restaurant);
  await setDoc(doc(db, 'users', uid), {
    restaurantId: uid,
    email,
    displayName: restaurantName,
    role: 'owner',
    createdAt: Timestamp.now(),
  });

  for (let i = 1; i <= 4; i++) {
    await addTable(uid, { number: String(i), status: 'available', currentOrderId: null });
  }

  // Create default categories
  const cat1Id = await addCategory(uid, { name: 'Starters', order: 0, isActive: true });
  const cat2Id = await addCategory(uid, { name: 'Main Course', order: 1, isActive: true });
  const cat3Id = await addCategory(uid, { name: 'Beverages', order: 2, isActive: true });

  // Create default menu items
  await addMenuItem(uid, {
    name: 'Paneer Tikka',
    description: 'Grilled cottage cheese blocks marinated with spices',
    price: 250,
    categoryId: cat1Id,
    imageUrl: '',
    isVeg: true,
    isAvailable: true,
    order: 0,
    createdAt: Timestamp.now(),
  });

  await addMenuItem(uid, {
    name: 'Butter Chicken',
    description: 'Creamy and rich tomato-based chicken curry',
    price: 350,
    categoryId: cat2Id,
    imageUrl: '',
    isVeg: false,
    isAvailable: true,
    order: 0,
    createdAt: Timestamp.now(),
  });

  await addMenuItem(uid, {
    name: 'Fresh Lime Soda',
    description: 'Refreshing sweet and salty lime soda',
    price: 80,
    categoryId: cat3Id,
    imageUrl: '',
    isVeg: true,
    isAvailable: true,
    order: 0,
    createdAt: Timestamp.now(),
  });

  return { uid, slug };
}
