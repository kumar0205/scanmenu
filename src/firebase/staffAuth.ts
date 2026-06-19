/**
 * staffAuth.ts — Spark-plan-compatible staff authentication
 *
 * Strategy:
 *   • Provisioning uses a secondary Firebase App instance so the owner's
 *     main auth session is never disrupted.
 *   • Login derives a deterministic 64-char password from the PIN so no
 *     server or Cloud Functions are required.
 *   • Firestore private/staffConfig stores chefUid + chefPinHash for the
 *     Settings "Active" indicator and for the users/{uid} role lookup.
 *
 * Security notes:
 *   • The derived password is SHA-256(pin + restaurantId + role + 'scanmenu'),
 *     which is 64 hex chars — strong enough that Firebase Auth brute-force
 *     protection kicks in long before a meaningful attack is possible.
 *   • Wrong PIN → wrong derived password → Firebase Auth rejects the sign-in.
 *   • Firebase Auth rate-limits failed sign-in attempts automatically.
 */

import {
  initializeApp,
  deleteApp,
  getApps,
  type FirebaseApp,
} from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from './config';
import type { StaffConfig } from '../types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Derives a strong, deterministic password from PIN + restaurantId + role. */
async function derivePassword(pin: string, restaurantId: string, role: 'chef' | 'waiter'): Promise<string> {
  const data = new TextEncoder().encode(`${pin}:${restaurantId}:${role}:scanmenu`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** SHA-256 hex of the PIN alone — stored in private/staffConfig for Settings UI. */
async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(pin);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Gets the Firebase config from the active (default) app so we can pass it to secondary. */
function getFirebaseConfig() {
  const app = getApps().find(a => a.name === '[DEFAULT]');
  if (!app) throw new Error('Firebase not initialised');
  const opts = app.options;
  return {
    apiKey: opts.apiKey,
    authDomain: opts.authDomain,
    projectId: opts.projectId,
    storageBucket: opts.storageBucket,
    messagingSenderId: opts.messagingSenderId,
    appId: opts.appId,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Provisions a Chef or Waiter Firebase Auth account.
 * Uses a secondary app instance so the owner's main session is never disrupted.
 * Each call generates a new unique email suffix, creating a fresh Firebase user.
 * This completely avoids the need for the old PIN when changing the PIN.
 */
export async function provisionStaffAccount(
  restaurantId: string,
  role: 'chef' | 'waiter',
  pin: string
): Promise<void> {
  const randomSuffix = Math.random().toString(36).substring(2, 10);
  const email = `${role}-${restaurantId}-${randomSuffix}@scanmenu.staff`;
  const password = await derivePassword(pin, restaurantId, role);
  const pinHash = await hashPin(pin);

  let secondaryApp: FirebaseApp | undefined;
  try {
    // Unique name avoids conflicts on repeated calls
    const appName = `staff-provision-${Date.now()}`;
    secondaryApp = initializeApp(getFirebaseConfig(), appName);
    const secondaryAuth = getAuth(secondaryApp);

    // Create the new Firebase Auth user (will never collide because of random suffix)
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const uid = cred.user.uid;

    await signOut(secondaryAuth);

    // Write users/{uid} with role + restaurantId
    await setDoc(
      doc(db, 'users', uid),
      {
        role,
        restaurantId,
        email,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Write private/staffConfig — only uid + pinHash (no password stored)
    const privateField =
      role === 'chef'
        ? { chefUid: uid, chefPinHash: pinHash }
        : { waiterUid: uid, waiterPinHash: pinHash };

    await setDoc(
      doc(db, 'restaurants', restaurantId, 'private', 'staffConfig'),
      { ...privateField, updatedAt: serverTimestamp() },
      { merge: true }
    );

    // Update public restaurant document with the active staff email and uid
    const publicField =
      role === 'chef'
        ? { chefEmail: email, chefUid: uid }
        : { waiterEmail: email, waiterUid: uid };

    await updateDoc(
      doc(db, 'restaurants', restaurantId),
      publicField
    );
  } finally {
    if (secondaryApp) {
      await deleteApp(secondaryApp).catch(() => {});
    }
  }
}

/**
 * Validates Restaurant Code (slug) + role + PIN, then signs into Firebase Auth.
 * Reads the dynamically generated email address from the public restaurant document.
 */
export async function validateAndSignInStaff(
  slug: string,
  role: 'chef' | 'waiter',
  pin: string
): Promise<void> {
  // 1. Resolve slug → restaurantId (public Firestore query)
  const q = query(
    collection(db, 'restaurants'),
    where('slug', '==', slug.trim().toLowerCase()),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) {
    throw new Error('Restaurant not found. Check the Restaurant Code.');
  }
  const restaurantDoc = snap.docs[0];
  const restaurantId = restaurantDoc.id;
  const restaurantData = restaurantDoc.data();

  // 2. Retrieve dynamic email from public restaurant document
  const emailField = role === 'chef' ? 'chefEmail' : 'waiterEmail';
  const email = restaurantData[emailField] as string | undefined;
  if (!email) {
    throw new Error(`${role === 'chef' ? 'Chef' : 'Waiter'} account is not set up yet.`);
  }

  // 3. Derive deterministic credentials from PIN
  const password = await derivePassword(pin, restaurantId, role);

  // 4. Sign in — Firebase Auth rejects wrong PIN naturally (wrong password)
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code;
    if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
      throw new Error('Invalid PIN or Restaurant Code.');
    }
    throw err;
  }
}

/**
 * Reads private/staffConfig to show whether Chef and Waiter accounts
 * have been provisioned. Only works when the owner is signed in.
 */
export async function getStaffStatus(restaurantId: string): Promise<{
  chefActive: boolean;
  waiterActive: boolean;
}> {
  try {
    const snap = await getDoc(
      doc(db, 'restaurants', restaurantId, 'private', 'staffConfig')
    );
    if (!snap.exists()) return { chefActive: false, waiterActive: false };
    const data = snap.data() as StaffConfig;
    return {
      chefActive: !!data.chefUid && !!data.chefPinHash,
      waiterActive: !!data.waiterUid && !!data.waiterPinHash,
    };
  } catch {
    return { chefActive: false, waiterActive: false };
  }
}
