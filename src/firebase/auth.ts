import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  signInAnonymously as firebaseSignInAnonymously,
  type User,
} from 'firebase/auth';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './config';
import { getRestaurantBySlug, addTable } from './db';
import { generateSlug } from '../utils/formatters';

export async function signInAnonymouslyUser() {
  return firebaseSignInAnonymously(auth);
}

export async function signIn(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function signOut() {
  return firebaseSignOut(auth);
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
  const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
  const uid = cred.user.uid;

  let slug = generateSlug(data.restaurantName);
  const existing = await getRestaurantBySlug(slug);
  if (existing) {
    slug = slug + '-' + Math.floor(100 + Math.random() * 900).toString();
  }

  const restaurant = {
    name: data.restaurantName,
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
    email: data.email,
    displayName: data.restaurantName,
    role: 'owner',
    createdAt: Timestamp.now(),
  });

  for (let i = 1; i <= 4; i++) {
    await addTable(uid, { number: String(i), status: 'available', currentOrderId: null });
  }

  return { uid, slug };
}
