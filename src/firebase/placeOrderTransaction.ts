import { doc, runTransaction, collection, Timestamp, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

interface PlaceOrderParams {
  restaurantId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  orderType: 'dinein' | 'delivery';
  orderSource: 'qr' | 'domain';
  tableId?: string;
  tableNumber?: string;
  address?: any;
  items: Array<{
    itemId: string;
    qty: number;
    name: string;
    price: number;
    isVeg: boolean;
    categoryId?: string;
    categoryName?: string;
  }>;
  note?: string;
  couponCode?: string;
  sessionId: string;
  isParcel?: boolean;
}

export async function placeOrderTransaction(db: Firestore, params: PlaceOrderParams): Promise<{ orderId: string; total: number }> {
  const {
    restaurantId,
    customerId,
    customerName,
    customerPhone,
    orderType,
    orderSource,
    tableId,
    tableNumber,
    address,
    items,
    note,
    couponCode,
    sessionId,
    isParcel
  } = params;

  // Pre-generate order reference to get its ID
  const orderCollectionRef = collection(db, 'restaurants', restaurantId, 'orders');
  const orderDocRef = doc(orderCollectionRef);
  const orderId = orderDocRef.id;

  // Generate date in IST timezone (UTC+5:30) for daily counters
  const now = new Date();
  const istTime = new Date(now.getTime() + (330 * 60000));
  const orderDate = istTime.toISOString().split('T')[0];

  const restaurantDocRef = doc(db, 'restaurants', restaurantId);
  const sessionDocRef = doc(db, 'sessions', sessionId);
  const counterDocRef = doc(db, 'restaurants', restaurantId, 'dailyCounters', orderDate);

  const couponDocRef = couponCode 
    ? doc(db, 'restaurants', restaurantId, 'coupons', couponCode.trim().toLowerCase()) 
    : null;

  // Parallel item references
  // Filter out custom water bottles or mock items that don't exist in items subcollection (e.g. addon-water-bottle)
  const dbItems = items.filter(
    (item) => !item.itemId.startsWith('water-bottle-') && !item.itemId.startsWith('addon-water-')
  );
  
  const itemDocRefs = dbItems.map((item) => 
    doc(db, 'restaurants', restaurantId, 'items', item.itemId)
  );

  const finalTotalAmount = await runTransaction(db, async (transaction) => {
    // 1. Fetch Restaurant Document
    const restaurantSnap = await transaction.get(restaurantDocRef);
    if (!restaurantSnap.exists()) {
      throw new Error('Restaurant not found');
    }
    const restaurantData = restaurantSnap.data();

    // Validate settings
    const orderingSettings = restaurantData.settings?.ordering ?? { qr: true, delivery: false };
    if (orderType === 'dinein' && !orderingSettings.qr) {
      throw new Error('QR Dine-In ordering is currently disabled for this restaurant');
    }
    if (orderType === 'delivery' && !orderingSettings.delivery) {
      throw new Error('Delivery ordering is currently disabled for this restaurant');
    }

    // 2. Fetch Item Documents to Validate Prices
    let calculatedSubtotal = 0;
    const verifiedOrderItems: any[] = [];

    // Retrieve item data in transaction
    for (let i = 0; i < dbItems.length; i++) {
      const originalItem = dbItems[i];
      const itemSnap = await transaction.get(itemDocRefs[i]);
      
      if (!itemSnap.exists()) {
        throw new Error(`Menu item "${originalItem.name}" no longer exists.`);
      }

      const itemData = itemSnap.data();
      if (!itemData.isAvailable) {
        throw new Error(`Menu item "${originalItem.name}" is currently sold out.`);
      }

      let price = itemData.price;
      let name = itemData.name;
      
      // Handle potential combo prices
      if (originalItem.itemId.includes('-combo-')) {
        const parts = originalItem.itemId.split('-combo-');
        const pax = parseInt(parts[1], 10);
        const comboOpt = itemData.comboPrices?.find((c: any) => c.persons === pax);
        if (comboOpt) {
          price = comboOpt.price;
          name = `${itemData.name} (${comboOpt.persons} Pax)`;
        }
      }

      calculatedSubtotal += price * originalItem.qty;
      verifiedOrderItems.push({
        itemId: originalItem.itemId,
        name: name,
        price: price,
        qty: originalItem.qty,
        isVeg: itemData.isVeg,
        categoryId: originalItem.categoryId || itemData.categoryId || '',
        categoryName: originalItem.categoryName || ''
      });
    }

    // Handle special water bottle item validation (legacy support)
    const waterItems = items.filter(
      (item) => item.itemId.startsWith('water-bottle-') || item.itemId.startsWith('addon-water-')
    );
    waterItems.forEach((waterItem) => {
      let waterPrice = restaurantData.waterBottle?.price || 20;
      let waterName = 'Mineral Water Bottle';
      
      if (waterItem.itemId.startsWith('water-bottle-')) {
        const optId = waterItem.itemId.replace('water-bottle-', '');
        const opt = (restaurantData.waterBottle?.options || []).find((o: any) => o.id === optId);
        if (opt) {
          waterPrice = opt.price;
          waterName = `Water Bottle (${opt.ml})`;
        }
      }
      calculatedSubtotal += waterPrice * waterItem.qty;
      verifiedOrderItems.push({
        itemId: waterItem.itemId,
        name: waterName,
        price: waterPrice,
        qty: waterItem.qty,
        isVeg: true,
        categoryId: 'addon-water',
        categoryName: 'Beverages'
      });
    });

    if (verifiedOrderItems.length === 0) {
      throw new Error('Your cart is empty');
    }

    // 3. Get Fees and Tax Config
    const deliverySettings = restaurantData.settings?.delivery ?? { fee: 40, radius: 6, minimumOrder: 200, zones: [] };
    const feesSettings = restaurantData.settings?.fees ?? { platformFee: 2, deliveryFee: 40 };

    const minOrderVal = deliverySettings.minimumOrder ?? 200;
    if (orderType === 'delivery' && calculatedSubtotal < minOrderVal) {
      throw new Error(`Minimum order of ₹${minOrderVal} is required for delivery.`);
    }

    // Taxes
    const taxConfig = restaurantData.tax ?? { cgstEnabled: false, cgstPercent: 9, sgstEnabled: false, sgstPercent: 9 };
    const cgstRate = taxConfig.cgstEnabled ? taxConfig.cgstPercent / 100 : 0;
    const sgstRate = taxConfig.sgstEnabled ? taxConfig.sgstPercent / 100 : 0;

    const cgstAmount = Math.round(calculatedSubtotal * cgstRate * 100) / 100;
    const sgstAmount = Math.round(calculatedSubtotal * sgstRate * 100) / 100;
    const totalTaxes = cgstAmount + sgstAmount;

    // Platform and delivery fee details
    const platformFeeVal = feesSettings.platformFee ?? 2;
    let deliveryFeeVal = 0;
    if (orderType === 'delivery') {
      const places = restaurantData.settings?.delivery?.places || [];
      const matchedPlace = address?.town
        ? places.find((p: any) => p.place.toLowerCase() === address.town.toLowerCase())
        : null;
      deliveryFeeVal = matchedPlace ? matchedPlace.fee : (feesSettings.deliveryFee ?? 40);
    }

    // 4. Validate Coupon (if applicable)
    let discountAmount = 0;
    if (orderType === 'delivery' && couponDocRef) {
      const couponSnap = await transaction.get(couponDocRef);
      if (!couponSnap.exists()) {
        throw new Error('Invalid coupon code');
      }
      const couponData = couponSnap.data();

      if (!couponData.isActive) {
        throw new Error('Coupon code is inactive');
      }

      if (couponData.expiryDate && couponData.expiryDate.toMillis() < Date.now()) {
        throw new Error('Coupon code has expired');
      }

      if (couponData.minOrderAmount && calculatedSubtotal < couponData.minOrderAmount) {
        throw new Error(`Coupon requires a minimum order of ₹${couponData.minOrderAmount}`);
      }

      if (couponData.usageLimit !== undefined && couponData.usedCount !== undefined && couponData.usedCount >= couponData.usageLimit) {
        throw new Error('Coupon usage limit reached');
      }

      // Compute Discount
      if (couponData.discountType === 'percentage') {
        discountAmount = Math.round(calculatedSubtotal * (couponData.discountValue / 100));
        if (couponData.maxDiscountAmount && discountAmount > couponData.maxDiscountAmount) {
          discountAmount = couponData.maxDiscountAmount;
        }
      } else {
        discountAmount = couponData.discountValue;
      }

      // Write coupon update (increment usage count)
      transaction.update(couponDocRef, {
        usedCount: (couponData.usedCount || 0) + 1
      });
    }

    // Compute Grand Total
    const finalTotal = Math.max(0, calculatedSubtotal + platformFeeVal + deliveryFeeVal + totalTaxes - discountAmount);

    // 5. Get Daily Order Counter Increment
    const counterSnap = await transaction.get(counterDocRef);
    let newDailyCount = 1;
    if (counterSnap.exists()) {
      newDailyCount = (counterSnap.data().count || 0) + 1;
    }
    
    // Write daily counter increment
    transaction.set(counterDocRef, { count: newDailyCount }, { merge: true });

    let sanitizedAddress = null;
    if (orderType === 'delivery' && address) {
      sanitizedAddress = {
        id: address.id || '',
        title: address.title || '',
        name: address.name || '',
        phone: address.phone || '',
        address: address.address || '',
        street: address.street || '',
        town: address.town || '',
        pincode: address.pincode || '',
        landmark: address.landmark || null,
        latitude: address.latitude !== undefined ? address.latitude : null,
        longitude: address.longitude !== undefined ? address.longitude : null
      };
    }

    // 6. Write Order payload
    const orderPayload = {
      customerId,
      customerName,
      customerPhone: customerPhone || null,
      tableId: orderType === 'dinein' ? (tableId || 'Takeaway') : null,
      tableNumber: orderType === 'dinein' ? (tableNumber || 'Takeaway') : 'Takeaway',
      items: verifiedOrderItems,
      subtotal: calculatedSubtotal,
      taxes: totalTaxes,
      deliveryFee: deliveryFeeVal,
      platformFee: platformFeeVal,
      total: finalTotal,
      totalAmount: finalTotal, // Duplicate for backwards compatibility
      status: 'pending',
      note: note || '',
      ratingSubmitted: false,
      paymentStatus: 'unpaid',
      orderType,
      orderSource,
      isParcel: isParcel || false,
      address: sanitizedAddress,
      dailyOrderId: newDailyCount,
      orderDate,
      sessionId,
      assignedRiderId: null,
      timeline: {
        orderedAt: Timestamp.now()
      },
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    transaction.set(orderDocRef, orderPayload);

    // 7. Write Session payload
    const sessionPayload = {
      restaurantId,
      restaurantName: restaurantData.name,
      restaurantSlug: restaurantData.slug,
      tableNumber: orderType === 'dinein' ? (tableNumber || 'Takeaway') : 'Takeaway',
      customerName,
      items: verifiedOrderItems,
      totalAmount: finalTotal,
      upiId: restaurantData.upiId || '',
      upiType: restaurantData.upiType || 'personal',
      customerId,
      status: 'pending_payment',
      orderId,
      expiresAt: new Timestamp(Math.floor((Date.now() + 60 * 60 * 1000) / 1000), 0)
    };

    return { finalTotal: finalTotal, sessionPayload };
  });

  // Write session doc after order doc commits successfully to satisfy exists() check in rules
  await setDoc(sessionDocRef, finalTotalAmount.sessionPayload);

  return {
    orderId,
    total: finalTotalAmount.finalTotal
  };
}
