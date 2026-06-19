import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

interface RequestedOrderItem {
  itemId: string;
  qty: number;
}

interface SubmitOrderData {
  restaurantId?: string;
  tableId?: string;
  tableNumber?: string;
  customerName?: string;
  note?: string;
  items?: RequestedOrderItem[];
}

interface CloudinarySignatureData {
  folder?: string;
}

const ALLOWED_UPLOAD_FOLDERS = new Set(["menu-items", "logos", "covers", "menuqr"]);

export const createCloudinarySignature = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to upload images.");
  }

  if (context.auth.token.firebase.sign_in_provider === 'anonymous') {
    throw new functions.https.HttpsError("permission-denied", "Anonymous users cannot upload images.");
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new functions.https.HttpsError("failed-precondition", "Cloudinary signing is not configured.");
  }

  const requestedFolder = ((data as CloudinarySignatureData).folder || "menuqr").trim();
  if (!ALLOWED_UPLOAD_FOLDERS.has(requestedFolder)) {
    throw new functions.https.HttpsError("invalid-argument", "Invalid upload folder.");
  }

  const folder = `scanmenu/${context.auth.uid}/${requestedFolder}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signatureBase = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash("sha1").update(signatureBase).digest("hex");

  return {
    cloudName,
    apiKey,
    folder,
    timestamp,
    signature,
  };
});

export const submitOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to place an order."
    );
  }

  const { restaurantId, tableId, tableNumber, customerName, note, items } = data as SubmitOrderData;

  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing restaurantId or empty items array."
    );
  }

  if (items.length > 50 || items.some((item) =>
    typeof item.itemId !== "string" ||
    !Number.isInteger(item.qty) ||
    item.qty < 1 ||
    item.qty > 20
  )) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Invalid order items."
    );
  }

  try {
    // 1. Fetch restaurant data (for UPI and info)
    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
    if (!restaurantSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Restaurant not found.");
    }
    const restaurant = restaurantSnap.data()!;

    // 2. Rate Limiting (max 3 orders per 5 min)
    const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
    const recentOrdersSnap = await db.collection("restaurants").doc(restaurantId).collection("orders")
      .where("customerId", "==", context.auth.uid)
      .where("createdAt", ">=", fiveMinutesAgo)
      .get();
      
    if (recentOrdersSnap.size >= 3) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many orders placed recently. Please wait.");
    }

    // 3. Validate Table Ownership and Get Real Table Number
    const passcode = tableId; // The UI sends the 4-digit passcode in the tableId field
    const verifiedTableNumber = tableNumber || "Takeaway";
    let finalTableId = "Takeaway";
    
    if (verifiedTableNumber !== "Takeaway") {
      if (!passcode) {
        throw new functions.https.HttpsError("permission-denied", "Missing table passcode. Please scan the QR code again.");
      }
      const tablesSnap = await db.collection("restaurants").doc(restaurantId).collection("tables").where("number", "==", verifiedTableNumber).get();
      if (tablesSnap.empty) {
        throw new functions.https.HttpsError("not-found", "Invalid table number for this restaurant.");
      }
      
      const tableDoc = tablesSnap.docs[0];
      const tableData = tableDoc.data();
      const storedToken = typeof tableData.qrToken === "string" ? tableData.qrToken : "";
      const tokenMatches = storedToken ? passcode === storedToken : tableDoc.id.startsWith(passcode);
      if (!tokenMatches) {
        throw new functions.https.HttpsError("permission-denied", "Invalid table passcode. Please scan the QR code again.");
      }
      
      finalTableId = tableDoc.id;
    }

    // 4. Fetch true prices and calculate total
    let totalAmount = 0;
    const orderItems: Array<{
      itemId: string;
      name: string;
      price: number;
      qty: number;
      isVeg: boolean;
    }> = [];

    // Parallel fetch for all items
    const itemRefs = items.map((i) => db.collection("restaurants").doc(restaurantId).collection("items").doc(i.itemId).get());
    const itemSnaps = await Promise.all(itemRefs);

    itemSnaps.forEach((snap, index) => {
      const requestedItem = items[index];
      // Special case for water bottle pseudo-item
      if (requestedItem.itemId === "addon-water-bottle" || requestedItem.itemId.startsWith("addon-water-bottle-")) {
        const qty = requestedItem.qty;
        let waterPrice = restaurant.waterBottle?.price || 20;
        let waterName = "Mineral Water Bottle";
        if (requestedItem.itemId.startsWith("addon-water-bottle-")) {
          const optId = requestedItem.itemId.replace("addon-water-bottle-", "");
          const opt = (restaurant.waterBottle?.options || []).find((o: { id: string; price: number; ml: string }) => o.id === optId);
          if (opt) {
            waterPrice = opt.price;
            waterName = `Mineral Water Bottle (${opt.ml})`;
          }
        }
        totalAmount += waterPrice * qty;
        orderItems.push({
          itemId: requestedItem.itemId,
          name: waterName,
          price: waterPrice,
          qty,
          isVeg: true,
        });
      } else if (snap.exists) {
        const itemData = snap.data()!;
        const qty = requestedItem.qty;
        totalAmount += itemData.price * qty;
        orderItems.push({
          itemId: snap.id,
          name: itemData.name,
          price: itemData.price,
          qty,
          isVeg: itemData.isVeg,
        });
      } else {
         // Optionally handle missing items, here we just skip them or throw an error.
         throw new functions.https.HttpsError("not-found", `Item ${requestedItem.itemId} not found.`);
      }
    });

    // Tax calculation if needed (currently client does cartTotal * 1.05 but let's assume totalAmount here is base, wait... 
    // Actually the client `MenuPage` shows "Taxes (5%)" and "Total: cartTotal * 1.05". We should calculate the final amount exactly.
    const finalTotalWithTax = Math.round(totalAmount * 1.05 * 100) / 100;

    // 5. Create the permanent Order record
    const orderRef = db.collection("restaurants").doc(restaurantId).collection("orders").doc();
    const orderId = orderRef.id;
    const now = admin.firestore.Timestamp.now();

    const orderPayload = {
      customerId: context.auth?.uid || "",
      customerName: customerName || "User",
      tableId: finalTableId,
      tableNumber: verifiedTableNumber,
      items: orderItems,
      totalAmount: finalTotalWithTax, // Using the verified server-calculated total
      status: "pending",
      note: note || "",
      ratingSubmitted: false,
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
    };

    // 6. Create the Session record for Payment Gateway/UPI
    const sessionId = crypto.randomUUID();
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionPayload = {
      restaurantId,
      restaurantName: restaurant.name,
      restaurantSlug: restaurant.slug,
      tableNumber: verifiedTableNumber,
      customerName: customerName || "User",
      items: orderItems,
      totalAmount: finalTotalWithTax, // Verified total
      upiId: restaurant.upiId || "",
      status: "pending_payment",
      orderId,
      expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 60 * 1000), // 30 min expiration
    };

    // Use a batch write for atomicity
    const batch = db.batch();
    batch.set(orderRef, orderPayload);
    batch.set(sessionRef, sessionPayload);
    
    // Update the session reference inside the order too
    batch.update(orderRef, { sessionId });

    await batch.commit();

    // 7. Return safe references to the client
    return {
      sessionId,
      orderId,
      totalAmount: finalTotalWithTax
    };

  } catch (error: unknown) {
    console.error("submitOrder error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to process order.");
  }
});

export const requestService = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be authenticated.");
  }

  const { restaurantId, tableNumber, qty, type } = data;
  
  if (!restaurantId || !tableNumber || !type) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  
  // Rate Limiting (max 3 requests per 5 min per user)
  const fiveMinutesAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 5 * 60 * 1000);
  const recentRequestsSnap = await db.collection("restaurants").doc(restaurantId).collection("requests")
    .where("customerId", "==", context.auth.uid)
    .where("createdAt", ">=", fiveMinutesAgo)
    .get();
    
  if (recentRequestsSnap.size >= 3) {
    throw new functions.https.HttpsError("resource-exhausted", "Too many requests. Please wait a moment.");
  }

  const reqRef = await db.collection("restaurants").doc(restaurantId).collection("requests").add({
    tableNumber,
    qty: Math.max(1, Math.min(20, qty || 1)),
    type,
    status: "pending",
    customerId: context.auth.uid,
    createdAt: admin.firestore.Timestamp.now(),
  });

  return { success: true, requestId: reqRef.id };
});

export const markSessionPaid = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const { sessionId } = data;
  if (!sessionId) {
    throw new functions.https.HttpsError("invalid-argument", "Session ID is required");
  }

  const db = admin.firestore();
  
  try {
    const sessionRef = db.collection("sessions").doc(sessionId);
    const sessionSnap = await sessionRef.get();
    
    if (!sessionSnap.exists) {
      throw new functions.https.HttpsError("not-found", "Session not found");
    }
    
    const sessionData = sessionSnap.data()!;
    
    // Verify ownership
    if (context.auth.uid !== sessionData.restaurantId) {
      throw new functions.https.HttpsError("permission-denied", "Only the restaurant owner can mark a session as paid");
    }

    if (sessionData.status === "paid") {
      return { success: true, message: "Already paid" };
    }

    const orderRef = db.collection("restaurants").doc(sessionData.restaurantId).collection("orders").doc(sessionData.orderId);
    
    const batch = db.batch();
    batch.update(sessionRef, { status: "paid" });
    batch.update(orderRef, { paymentStatus: "paid" });
    
    await batch.commit();
    
    return { success: true };
  } catch (error: unknown) {
    console.error("markSessionPaid error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError("internal", "Failed to mark session as paid");
  }
});

async function deleteCollection(collectionRef: admin.firestore.CollectionReference, batchSize = 250) {
  while (true) {
    const snap = await collectionRef.limit(batchSize).get();
    if (snap.empty) return;

    const batch = db.batch();
    snap.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();

    if (snap.size < batchSize) return;
  }
}

export const deleteRestaurantAccount = functions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be logged in.");
  }

  const uid = context.auth.uid;
  const restaurantRef = db.collection("restaurants").doc(uid);
  const restaurantSnap = await restaurantRef.get();

  if (!restaurantSnap.exists || restaurantSnap.data()?.ownerId !== uid) {
    throw new functions.https.HttpsError("permission-denied", "Only the restaurant owner can delete this account.");
  }

  const childCollections = ["items", "categories", "tables", "orders", "requests", "ratings"];
  await Promise.all(childCollections.map((name) => deleteCollection(restaurantRef.collection(name))));

  const sessionsSnap = await db.collection("sessions").where("restaurantId", "==", uid).get();
  const sessionBatch = db.batch();
  sessionsSnap.docs.forEach((docSnap) => sessionBatch.delete(docSnap.ref));
  if (!sessionsSnap.empty) await sessionBatch.commit();

  const batch = db.batch();
  batch.delete(restaurantRef);
  batch.delete(db.collection("users").doc(uid));
  await batch.commit();

  await admin.auth().deleteUser(uid);

  return { success: true };
});

// ─── Staff Access Functions ───────────────────────────────────────────────────

/**
 * provisionStaffAccount
 * Called by the restaurant owner in Settings to create a Chef or Waiter account.
 * Uses Admin SDK so the owner's Firebase client session is never disrupted.
 * Stores only the Firebase UID and SHA-256 pin hash — never stores the password.
 */
export const provisionStaffAccount = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in as owner.");
  }

  const { restaurantId, role, pin } = data as {
    restaurantId?: string;
    role?: string;
    pin?: string;
  };

  if (!restaurantId || !role || !pin) {
    throw new functions.https.HttpsError("invalid-argument", "restaurantId, role, and pin are required.");
  }
  if (role !== "chef" && role !== "waiter") {
    throw new functions.https.HttpsError("invalid-argument", "role must be 'chef' or 'waiter'.");
  }
  if (!/^\d{4,8}$/.test(pin)) {
    throw new functions.https.HttpsError("invalid-argument", "PIN must be 4–8 digits.");
  }

  // Verify caller is the restaurant owner
  const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (!restaurantSnap.exists || restaurantSnap.data()?.ownerId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Only the restaurant owner can provision staff accounts.");
  }

  const email = `${role}-${restaurantId}@scanmenu.staff`;
  // Generate a strong random password — never returned to client, never stored
  const password = crypto.randomBytes(24).toString("hex");
  const pinHash = crypto.createHash("sha256").update(pin).digest("hex");

  // Create Firebase Auth user, or re-use existing if already provisioned
  let uid: string;
  try {
    const existing = await admin.auth().getUserByEmail(email);
    uid = existing.uid;
    // Update password on re-provision so old sessions are invalidated
    await admin.auth().updateUser(uid, { password });
  } catch {
    const cred = await admin.auth().createUser({ email, password, displayName: role });
    uid = cred.uid;
  }

  // Write users/{uid} with role + restaurantId
  await db.collection("users").doc(uid).set({
    role,
    restaurantId,
    email,
    createdAt: admin.firestore.Timestamp.now(),
  }, { merge: true });

  // Write only uid + pinHash to the private staffConfig — no password stored
  const staffConfigRef = db
    .collection("restaurants").doc(restaurantId)
    .collection("private").doc("staffConfig");

  const field = role === "chef"
    ? { chefUid: uid, chefPinHash: pinHash }
    : { waiterUid: uid, waiterPinHash: pinHash };

  await staffConfigRef.set(
    { ...field, updatedAt: admin.firestore.Timestamp.now() },
    { merge: true }
  );

  return { success: true };
});

/**
 * validateStaffPin
 * Called during Chef/Waiter login. No Firebase auth required — this IS the auth step.
 * Rate limited to 5 failed attempts per 60 seconds per restaurant+role.
 * Returns a Firebase Custom Token on success.
 */
export const validateStaffPin = functions.https.onCall(async (data, _context) => {
  const { slug, role, pin } = data as {
    slug?: string;
    role?: string;
    pin?: string;
  };

  if (!slug || !role || !pin) {
    throw new functions.https.HttpsError("invalid-argument", "slug, role, and pin are required.");
  }
  if (role !== "chef" && role !== "waiter") {
    throw new functions.https.HttpsError("invalid-argument", "role must be 'chef' or 'waiter'.");
  }

  // 1. Find restaurant by slug
  const restaurantSnap = await db.collection("restaurants")
    .where("slug", "==", slug.trim().toLowerCase())
    .limit(1)
    .get();

  if (restaurantSnap.empty) {
    throw new functions.https.HttpsError("not-found", "Restaurant not found. Check the Restaurant Code.");
  }
  const restaurantId = restaurantSnap.docs[0].id;

  // 2. Rate limiting — max 5 failed attempts per 60s per restaurant+role
  const rateLimitRef = db
    .collection("restaurants").doc(restaurantId)
    .collection("private").doc("loginAttempts");

  const rateLimitSnap = await rateLimitRef.get();
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 5;

  const attemptsField = role === "chef" ? "chefFailedAttempts" : "waiterFailedAttempts";
  const lastAttemptField = role === "chef" ? "chefLastAttemptAt" : "waiterLastAttemptAt";

  if (rateLimitSnap.exists) {
    const rateData = rateLimitSnap.data()!;
    const lastAttempt: number = rateData[lastAttemptField]?.toMillis?.() ?? 0;
    const failed: number = rateData[attemptsField] ?? 0;

    if (now - lastAttempt < windowMs && failed >= maxAttempts) {
      const waitSec = Math.ceil((windowMs - (now - lastAttempt)) / 1000);
      throw new functions.https.HttpsError(
        "resource-exhausted",
        `Too many failed attempts. Please wait ${waitSec} seconds.`
      );
    }
  }

  // 3. Read private staffConfig
  const configSnap = await db
    .collection("restaurants").doc(restaurantId)
    .collection("private").doc("staffConfig").get();

  if (!configSnap.exists) {
    throw new functions.https.HttpsError("not-found", "Staff accounts have not been set up for this restaurant.");
  }

  const config = configSnap.data()!;
  const pinHashField = role === "chef" ? "chefPinHash" : "waiterPinHash";
  const uidField     = role === "chef" ? "chefUid"     : "waiterUid";

  const storedHash: string | undefined = config[pinHashField];
  const staffUid: string | undefined   = config[uidField];

  if (!storedHash || !staffUid) {
    throw new functions.https.HttpsError("not-found", `${role === "chef" ? "Chef" : "Waiter"} account not set up yet.`);
  }

  // 4. Validate PIN
  const inputHash = crypto.createHash("sha256").update(pin).digest("hex");
  if (inputHash !== storedHash) {
    // Increment failed attempts counter
    const lastAttemptMs: number = rateLimitSnap.exists
      ? (rateLimitSnap.data()![lastAttemptField]?.toMillis?.() ?? 0)
      : 0;
    const currentFailed: number = rateLimitSnap.exists
      ? (rateLimitSnap.data()![attemptsField] ?? 0)
      : 0;
    const inWindow = now - lastAttemptMs < windowMs;

    await rateLimitRef.set({
      [attemptsField]: inWindow ? currentFailed + 1 : 1,
      [lastAttemptField]: admin.firestore.Timestamp.fromMillis(now),
    }, { merge: true });

    throw new functions.https.HttpsError("permission-denied", "Invalid PIN.");
  }

  // 5. PIN correct — reset rate limit for this role
  await rateLimitRef.set({
    [attemptsField]: 0,
    [lastAttemptField]: admin.firestore.Timestamp.fromMillis(now),
  }, { merge: true });

  // 6. Write lastLoginAt to users/{uid}
  await db.collection("users").doc(staffUid).update({
    lastLoginAt: admin.firestore.Timestamp.fromMillis(now),
  });

  // 7. Create and return Firebase Custom Token
  const token = await admin.auth().createCustomToken(staffUid);
  return { token };
});

/**
 * updateStaffPin
 * Called by the owner to change a staff PIN without recreating the Firebase account.
 * Only updates the pinHash field — UID and account are unchanged.
 */
export const updateStaffPin = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Must be signed in as owner.");
  }

  const { restaurantId, role, newPin } = data as {
    restaurantId?: string;
    role?: string;
    newPin?: string;
  };

  if (!restaurantId || !role || !newPin) {
    throw new functions.https.HttpsError("invalid-argument", "restaurantId, role, and newPin are required.");
  }
  if (role !== "chef" && role !== "waiter") {
    throw new functions.https.HttpsError("invalid-argument", "role must be 'chef' or 'waiter'.");
  }
  if (!/^\d{4,8}$/.test(newPin)) {
    throw new functions.https.HttpsError("invalid-argument", "PIN must be 4–8 digits.");
  }

  // Verify caller is the restaurant owner
  const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
  if (!restaurantSnap.exists || restaurantSnap.data()?.ownerId !== context.auth.uid) {
    throw new functions.https.HttpsError("permission-denied", "Only the restaurant owner can change staff PINs.");
  }

  const pinHash = crypto.createHash("sha256").update(newPin).digest("hex");
  const pinHashField = role === "chef" ? "chefPinHash" : "waiterPinHash";

  await db
    .collection("restaurants").doc(restaurantId)
    .collection("private").doc("staffConfig")
    .update({ [pinHashField]: pinHash, updatedAt: admin.firestore.Timestamp.now() });

  // Also reset any rate limit counters for this role
  const attemptsField = role === "chef" ? "chefFailedAttempts" : "waiterFailedAttempts";
  await db
    .collection("restaurants").doc(restaurantId)
    .collection("private").doc("loginAttempts")
    .set({ [attemptsField]: 0 }, { merge: true });

  return { success: true };
});
