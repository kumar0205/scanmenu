import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

admin.initializeApp();
const db = admin.firestore();

export const submitOrder = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to place an order."
    );
  }

  const { restaurantId, tableId, tableNumber, customerName, note, items } = data;

  if (!restaurantId || !Array.isArray(items) || items.length === 0) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing restaurantId or empty items array."
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

    // 3. Validate Table Ownership
    const finalTableId = tableId || tableNumber;
    if (finalTableId && finalTableId !== "Takeaway") {
      const tableSnap = await db.collection("restaurants").doc(restaurantId).collection("tables").doc(finalTableId).get();
      if (!tableSnap.exists) {
        throw new functions.https.HttpsError("not-found", "Invalid table ID for this restaurant.");
      }
    }

    // 4. Fetch true prices and calculate total
    let totalAmount = 0;
    const orderItems: any[] = [];

    // Parallel fetch for all items
    const itemRefs = items.map((i: any) => db.collection("restaurants").doc(restaurantId).collection("items").doc(i.itemId).get());
    const itemSnaps = await Promise.all(itemRefs);

    itemSnaps.forEach((snap, index) => {
      const requestedItem = items[index];
      // Special case for water bottle pseudo-item
      if (requestedItem.itemId === "addon-water-bottle") {
        const qty = requestedItem.qty || 1;
        totalAmount += 20 * qty; // Hardcoded fallback or could be from restaurant config
        orderItems.push({
          itemId: "addon-water-bottle",
          name: "Mineral Water Bottle",
          price: 20,
          qty,
          isVeg: true,
        });
      } else if (snap.exists) {
        const itemData = snap.data()!;
        const qty = requestedItem.qty || 1;
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
      tableId: tableId || tableNumber,
      tableNumber: tableNumber || tableId || "Takeaway",
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
      tableNumber,
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

  } catch (error: any) {
    console.error("submitOrder error:", error);
    throw new functions.https.HttpsError("internal", "Failed to process order.");
  }
});
