import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Minus, Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthContext } from '../../context/AuthContext';
import { useMenu } from '../../hooks/useMenu';
import { subscribeToTables } from '../../firebase/db';
import { db } from '../../firebase/config';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import toast from 'react-hot-toast';
import type { MenuItem, Table, OrderItem } from '../../types';

interface PlaceOrderModalProps {
  open: boolean;
  onClose: () => void;
}

interface CartItem extends OrderItem {
  imageUrl?: string;
}

export function PlaceOrderModal({ open, onClose }: PlaceOrderModalProps) {
  const { user, restaurant, restaurantId } = useAuthContext();
  const { categories, items, loading: menuLoading } = useMenu(restaurantId);

  // Database lists
  const [tables, setTables] = useState<Table[]>([]);
  
  // Form States
  const [selectedTableType, setSelectedTableType] = useState<'dropdown' | 'takeaway' | 'custom'>('dropdown');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [customTableNumber, setCustomTableNumber] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [autoAccept, setAutoAccept] = useState<boolean>(true);
  const [orderType, setOrderType] = useState<'dinein' | 'parcel' | 'delivery'>('dinein');
  const [deliveryName, setDeliveryName] = useState<string>('');
  const [deliveryPhone, setDeliveryPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryStreet, setDeliveryStreet] = useState<string>('');
  const [deliveryLandmark, setDeliveryLandmark] = useState<string>('');
  const [deliveryTown, setDeliveryTown] = useState<string>('');
  const [placing, setPlacing] = useState<boolean>(false);

  // Menu Search/Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mobileTab, setMobileTab] = useState<'menu' | 'cart'>('menu');

  // Fetch Tables
  useEffect(() => {
    if (!restaurantId || !open) return;
    const unsub = subscribeToTables(restaurantId, (loadedTables) => {
      setTables(loadedTables);
      if (loadedTables.length > 0 && !selectedTableNumber) {
        setSelectedTableNumber(loadedTables[0].number);
      }
    });
    return unsub;
  }, [restaurantId, open]);

  // Reset states when modal closes/opens
  useEffect(() => {
    if (open) {
      setCart([]);
      setCustomerName('');
      setNote('');
      setSearchTerm('');
      setActiveCategoryId('all');
      setCustomTableNumber('');
      setSelectedTableType('dropdown');
      setAutoAccept(true);
      setOrderType('dinein');
      setDeliveryName('');
      setDeliveryPhone('');
      setDeliveryAddress('');
      setDeliveryStreet('');
      setDeliveryLandmark('');
      setDeliveryTown('');
      setMobileTab('menu');
      if (tables.length > 0) {
        setSelectedTableNumber(tables[0].number);
      }
    }
  }, [open, tables]);

  // Derived Values
  const activeItems = useMemo(() => items.filter(i => i.isAvailable), [items]);
  
  const filteredItems = useMemo(() => {
    return activeItems.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = activeCategoryId === 'all' || item.categoryId === activeCategoryId;
      return matchesSearch && matchesCategory;
    });
  }, [activeItems, searchTerm, activeCategoryId]);

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (item.price * item.qty), 0);
  }, [cart]);

  const taxDetails = useMemo(() => {
    const cgstRate = restaurant?.tax?.cgstEnabled ? (restaurant.tax.cgstPercent / 100) : 0;
    const sgstRate = restaurant?.tax?.sgstEnabled ? (restaurant.tax.sgstPercent / 100) : 0;
    const cgstAmount = Math.round(cartTotal * cgstRate * 100) / 100;
    const sgstAmount = Math.round(cartTotal * sgstRate * 100) / 100;

    const deliveryFeeVal = orderType === 'delivery'
      ? (restaurant?.settings?.delivery?.places?.find((p: any) => p.place.toLowerCase() === deliveryTown.toLowerCase())?.fee ?? restaurant?.settings?.fees?.deliveryFee ?? 40)
      : 0;

    const totalAmount = Math.round((cartTotal + deliveryFeeVal) * (1 + cgstRate + sgstRate) * 100) / 100;

    return {
      cgstAmount,
      sgstAmount,
      totalAmount,
      deliveryFee: deliveryFeeVal,
      cgstPercent: restaurant?.tax?.cgstPercent ?? 0,
      sgstPercent: restaurant?.tax?.sgstPercent ?? 0,
      cgstEnabled: restaurant?.tax?.cgstEnabled ?? false,
      sgstEnabled: restaurant?.tax?.sgstEnabled ?? false,
    };
  }, [cartTotal, restaurant, orderType, deliveryTown]);

  // Cart Mutations
  const updateQty = (item: MenuItem, change: number, comboPax?: number) => {
    const isCombo = item.isCombo && comboPax !== undefined;
    const id = isCombo ? `${item.id}-combo-${comboPax}p` : item.id;
    
    setCart(prev => {
      const existing = prev.find(c => c.itemId === id);
      if (existing) {
        const newQty = existing.qty + change;
        if (newQty <= 0) {
          return prev.filter(c => c.itemId !== id);
        }
        return prev.map(c => c.itemId === id ? { ...c, qty: newQty } : c);
      } else if (change > 0) {
        let name = item.name;
        let price = item.price;
        if (isCombo && item.comboPrices) {
          const cp = item.comboPrices.find(c => c.persons === comboPax);
          if (cp) {
            name = `${item.name} (${comboPax} Person${comboPax > 1 ? 's' : ''})`;
            price = cp.price;
          }
        }
        const category = categories.find(c => c.id === item.categoryId);
        return [
          ...prev,
          {
            itemId: id,
            name,
            price,
            qty: 1,
            isVeg: item.isVeg,
            imageUrl: item.imageUrl,
            categoryId: item.categoryId,
            categoryName: category ? category.name : 'Uncategorized'
          }
        ];
      }
      return prev;
    });
  };

  const removeItem = (itemId: string) => {
    setCart(prev => prev.filter(c => c.itemId !== itemId));
  };

  // Place Order Submitter
  const handlePlaceOrder = async () => {
    if (!restaurant || !restaurantId) return;
    if (cart.length === 0) {
      toast.error('Cart is empty. Please select at least one item.');
      return;
    }

    // Determine Table Number
    let tableNo = '';
    if (orderType === 'delivery') {
      tableNo = 'Delivery';
    } else if (orderType === 'parcel' || selectedTableType === 'takeaway') {
      tableNo = 'Takeaway';
    } else if (selectedTableType === 'custom') {
      tableNo = customTableNumber.trim();
      if (!tableNo) {
        toast.error('Please enter a custom table number.');
        return;
      }
    } else {
      tableNo = selectedTableNumber;
      if (!tableNo) {
        toast.error('Please select a table number.');
        return;
      }
    }

    let finalAddressObj: any = null;
    if (orderType === 'delivery') {
      if (!deliveryName.trim()) {
        toast.error('Please enter delivery recipient name.');
        return;
      }
      if (!deliveryPhone.trim()) {
        toast.error('Please enter delivery contact phone.');
        return;
      }
      if (!deliveryAddress.trim()) {
        toast.error('Please enter Door No / House No.');
        return;
      }
      if (!deliveryStreet.trim()) {
        toast.error('Please enter Street Name.');
        return;
      }
      if (!deliveryTown.trim()) {
        toast.error('Please select or enter Village / Town.');
        return;
      }

      finalAddressObj = {
        id: 'manual_' + Date.now().toString(36),
        title: 'Delivery',
        name: deliveryName.trim(),
        phone: deliveryPhone.trim(),
        address: deliveryAddress.trim(),
        street: deliveryStreet.trim(),
        landmark: deliveryLandmark.trim() || undefined,
        town: deliveryTown.trim(),
        pincode: ''
      };
    }

    const finalCustomerName = orderType === 'delivery'
      ? deliveryName.trim()
      : (customerName.trim() || `Table ${tableNo} Walk-in`);
    setPlacing(true);

    try {
      // Create session UUID
      const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Generate daily order number using IST timezone (UTC+5:30)
      const now = new Date();
      const istTime = new Date(now.getTime() + (330 * 60000));
      const orderDate = istTime.toISOString().split('T')[0];

      const counterRef = doc(db, 'restaurants', restaurantId, 'dailyCounters', orderDate);
      
      const dailyOrderId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let newCount = 1;
        if (counterDoc.exists()) {
          newCount = (counterDoc.data().count || 0) + 1;
        }
        transaction.set(counterRef, { count: newCount }, { merge: true });
        return newCount;
      });

      // Prepare order collection ref
      const orderRef = doc(collection(db, 'restaurants', restaurantId, 'orders'));
      const orderId = orderRef.id;

      // Clean cart items to match firestore schema (remove client imageUrl)
      const cleanedItems = cart.map(({ itemId, name, price, qty, isVeg, isExtra, categoryId, categoryName }) => ({
        itemId,
        name,
        price,
        qty,
        isVeg,
        ...(isExtra !== undefined ? { isExtra } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(categoryName !== undefined ? { categoryName } : {})
      }));

      // 1. Create order as unpaid/pending (comply with firestore allow create rules)
      await setDoc(orderRef, {
        customerId: user?.uid || restaurant.ownerId, // Authenticated user UID (must match request.auth.uid for create rules)
        customerName: finalCustomerName,
        tableId: tableNo,
        tableNumber: tableNo,
        items: cleanedItems,
        totalAmount: taxDetails.totalAmount,
        status: 'pending',
        note: note || '',
        ratingSubmitted: false,
        paymentStatus: 'unpaid',
        sessionId,
        dailyOrderId,
        orderDate,
        isParcel: orderType === 'parcel',
        orderType: orderType === 'delivery' ? 'delivery' : 'dinein',
        ...(finalAddressObj ? { address: finalAddressObj } : {}),
        ...(orderType === 'delivery' ? { deliveryFee: taxDetails.deliveryFee } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // 2. Create payment session as pending_payment (comply with session allow create rules)
      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, {
        restaurantId: restaurantId,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        tableNumber: tableNo,
        customerName: finalCustomerName,
        items: cleanedItems, // Must match the order's items array structure exactly to satisfy security rules comparison
        totalAmount: taxDetails.totalAmount,
        upiId: restaurant.upiId || '',
        upiType: restaurant.upiType || 'personal',
        customerId: user?.uid || restaurant.ownerId,
        status: 'pending_payment',
        orderId,
        isParcel: orderType === 'parcel',
        orderType: orderType === 'delivery' ? 'delivery' : 'dinein',
        ...(finalAddressObj ? { address: finalAddressObj } : {}),
        ...(orderType === 'delivery' ? { deliveryFee: taxDetails.deliveryFee } : {}),
        expiresAt: new Timestamp(
          Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
          0
        ),
      });

      // 3. Perform admin overrides (owners have unrestricted updates under firebase.rules)
      const updates: Record<string, any> = {};
      let isUpdated = false;

      if (autoAccept) {
        updates.status = 'accepted';
        isUpdated = true;
      }

      if (isUpdated) {
        await updateDoc(orderRef, {
          ...updates,
          updatedAt: serverTimestamp()
        });
      }

      toast.success('Manual order placed successfully!');
      onClose();
    } catch (error: unknown) {
      console.error('Admin order placement error:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to place order: ${msg}`);
    } finally {
      setPlacing(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Place Manual Order"
      className="max-w-5xl w-full max-h-[90vh] flex flex-col"
      bodyClassName="flex-1 flex flex-col overflow-hidden p-0 min-h-0"
    >
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0" style={{ height: 'calc(90vh - 72px)' }}>
        
        {/* Left Column: Menu Browsing */}
        <div className={`flex-1 flex flex-col border-r border-[#2a2a2a] bg-[#0d0d0d] overflow-hidden ${
          mobileTab === 'menu' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Search & Categories */}
          <div className="p-4 space-y-3 bg-[#111111] border-b border-[#2a2a2a] shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa]" />
              <Input
                type="text"
                placeholder="Search menu items..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm focus:outline-none"
              />
            </div>
            
            {/* Category horizontal scrolling pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setActiveCategoryId('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                  activeCategoryId === 'all'
                    ? 'bg-[#22c55e] border-[#22c55e] text-black font-bold'
                    : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#a1a1aa] hover:text-white'
                }`}
              >
                All Categories
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategoryId(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition-all ${
                    activeCategoryId === cat.id
                      ? 'bg-[#22c55e] border-[#22c55e] text-black font-bold'
                      : 'bg-[#1a1a1a] border-[#2a2a2a] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Items Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {menuLoading ? (
              <div className="flex flex-col items-center justify-center h-48 space-y-2">
                <Loader2 className="w-8 h-8 text-[#22c55e] animate-spin" />
                <span className="text-xs text-[#a1a1aa]">Loading menu items...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-[#a1a1aa] text-sm">
                No items found matching criteria.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredItems.map(item => {
                  const categoryName = categories.find(c => c.id === item.categoryId)?.name ?? '';
                  const inCartQty = item.isCombo ? 0 : (cart.find(c => c.itemId === item.id)?.qty ?? 0);

                  return (
                    <div
                      key={item.id}
                      className={`bg-[#111111] border rounded-lg p-3 flex flex-col justify-between transition-all ${
                        inCartQty > 0 ? 'border-[#22c55e]' : 'border-[#2a2a2a] hover:border-[#3a3a3a]'
                      }`}
                    >
                      <div className="flex gap-2.5">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-16 h-16 rounded-md object-cover border border-[#2a2a2a] shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-md bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-lg shrink-0 select-none">
                            🍽️
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.isVeg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                            <h4 className="text-sm font-semibold text-white truncate">{item.name}</h4>
                          </div>
                          <p className="text-[10px] text-[#52525b] mt-0.5 uppercase tracking-wider">{categoryName}</p>
                          <p className="text-xs text-[#22c55e] font-semibold mt-1">
                            {restaurant?.currency ?? '₹'}{item.price}
                          </p>
                        </div>
                      </div>

                      {/* Add controls */}
                      <div className="mt-3 pt-2 border-t border-[#2a2a2a] flex justify-end">
                        {item.isCombo && item.comboPrices && item.comboPrices.length > 0 ? (
                          <div className="w-full space-y-1.5">
                            <span className="text-[10px] text-[#a1a1aa] font-bold block uppercase tracking-wider">Combo Offers</span>
                            {item.comboPrices.map(cp => {
                              const comboId = `${item.id}-combo-${cp.persons}p`;
                              const comboQty = cart.find(c => c.itemId === comboId)?.qty ?? 0;
                              return (
                                <div key={cp.persons} className="flex justify-between items-center text-xs bg-[#1a1a1a] p-1.5 rounded border border-[#2a2a2a]">
                                  <span className="text-[#a1a1aa] font-medium">{cp.persons} Pax ({restaurant?.currency ?? '₹'}{cp.price})</span>
                                  <div className="flex items-center gap-2">
                                    {comboQty > 0 ? (
                                      <>
                                        <button
                                          onClick={() => updateQty(item, -1, cp.persons)}
                                          className="w-5 h-5 rounded bg-[#2a2a2a] hover:bg-[#ef4444] text-white flex items-center justify-center transition-colors"
                                        >
                                          <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-white font-bold w-4 text-center">{comboQty}</span>
                                        <button
                                          onClick={() => updateQty(item, 1, cp.persons)}
                                          className="w-5 h-5 rounded bg-[#2a2a2a] hover:bg-[#22c55e] hover:text-black text-white flex items-center justify-center transition-colors"
                                        >
                                          <Plus className="w-3 h-3" />
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => updateQty(item, 1, cp.persons)}
                                        className="px-2 py-0.5 rounded bg-transparent border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black font-semibold text-[10px] transition-all"
                                      >
                                        + Add
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div>
                            {inCartQty > 0 ? (
                              <div className="flex items-center gap-2.5">
                                <button
                                  onClick={() => updateQty(item, -1)}
                                  className="w-7 h-7 rounded-lg bg-[#2a2a2a] hover:bg-[#ef4444] text-white flex items-center justify-center transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-white font-bold w-6 text-center text-sm">{inCartQty}</span>
                                <button
                                  onClick={() => updateQty(item, 1)}
                                  className="w-7 h-7 rounded-lg bg-[#2a2a2a] hover:bg-[#22c55e] hover:text-black text-white flex items-center justify-center transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => updateQty(item, 1)}
                                className="px-3 py-1 rounded-lg border border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black font-bold text-xs transition-all flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" /> Add Item
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Mobile Bottom Checkout Button */}
          {cart.length > 0 && (
            <div className="md:hidden p-3 bg-[#111111] border-t border-[#2a2a2a] shrink-0">
              <Button
                onClick={() => setMobileTab('cart')}
                className="w-full bg-[#22c55e] text-black hover:bg-[#1ea34d] font-bold text-xs uppercase tracking-wider py-2.5 flex items-center justify-center gap-1.5 border-none"
              >
                Proceed to Checkout ({cart.reduce((s, i) => s + i.qty, 0)} items)
              </Button>
            </div>
          )}
        </div>

        {/* Right Column: Checkout Info & Selected Items */}
        <div className={`w-full md:w-96 flex flex-col bg-[#111111] overflow-hidden shrink-0 ${
          mobileTab === 'cart' ? 'flex' : 'hidden md:flex'
        }`}>
          
          {/* Mobile Back Button */}
          <div className="md:hidden p-3 bg-[#111111] border-b border-[#2a2a2a] shrink-0">
            <button
              type="button"
              onClick={() => setMobileTab('menu')}
              className="text-xs font-semibold text-[#a1a1aa] hover:text-white flex items-center gap-1 bg-transparent border-none"
            >
              ← Back to Menu
            </button>
          </div>

          {/* Scrollable Upper Area (Customer Info & Cart Items) */}
          <div className="flex-1 overflow-y-auto">
            
            {/* Customer / Table Info */}
            <div className="p-4 border-b border-[#2a2a2a] space-y-3.5">
              <div>
                <label className="text-xs font-semibold text-[#a1a1aa] block mb-1.5 uppercase tracking-wider">Order Type</label>
                <div className="grid grid-cols-3 gap-1 bg-[#1a1a1a] p-1 rounded-lg border border-[#2a2a2a]">
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('dinein');
                      if (selectedTableType === 'takeaway') {
                        setSelectedTableType('dropdown');
                      }
                    }}
                    className={`py-1.5 px-2 text-xs font-bold rounded transition-colors text-center ${
                      orderType === 'dinein' ? 'bg-[#22c55e] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    Dine-In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('parcel');
                      setSelectedTableType('takeaway');
                    }}
                    className={`py-1.5 px-2 text-xs font-bold rounded transition-colors text-center ${
                      orderType === 'parcel' ? 'bg-[#22c55e] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    Parcel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOrderType('delivery');
                      setSelectedTableType('takeaway');
                    }}
                    className={`py-1.5 px-2 text-xs font-bold rounded transition-colors text-center ${
                      orderType === 'delivery' ? 'bg-[#22c55e] text-black font-bold' : 'text-[#a1a1aa] hover:text-white'
                    }`}
                  >
                    Delivery
                  </button>
                </div>
              </div>

              {orderType === 'dinein' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-[#a1a1aa] block mb-1.5 uppercase tracking-wider">Select Table No</label>
                  <select
                    value={selectedTableNumber}
                    onChange={e => setSelectedTableNumber(e.target.value)}
                    className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#22c55e]"
                  >
                    {tables.map(t => (
                      <option key={t.id} value={t.number} className="bg-[#111111] text-white">
                        Table {t.number}
                      </option>
                    ))}
                    {tables.length === 0 && (
                      <option value="" disabled className="bg-[#111111] text-white">No Tables Configured</option>
                    )}
                  </select>
                </div>
              )}

              {orderType === 'delivery' && (
                <div className="space-y-3.5 border-t border-[#2a2a2a] pt-3.5">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Delivery Address Details</h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      label="Recipient Name"
                      placeholder="Receiver's name"
                      value={deliveryName}
                      onChange={e => setDeliveryName(e.target.value)}
                      className="py-1.5 text-white"
                    />
                    <Input
                      type="tel"
                      label="Phone Number"
                      placeholder="10-digit number"
                      value={deliveryPhone}
                      onChange={e => setDeliveryPhone(e.target.value.replace(/\D/g, ''))}
                      className="py-1.5 text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="text"
                      label="Door No / House No"
                      placeholder="e.g. 4/12, Flat 101"
                      value={deliveryAddress}
                      onChange={e => setDeliveryAddress(e.target.value)}
                      className="py-1.5 text-white"
                    />
                    <Input
                      type="text"
                      label="Street Name"
                      placeholder="e.g. Temple Street"
                      value={deliveryStreet}
                      onChange={e => setDeliveryStreet(e.target.value)}
                      className="py-1.5 text-white"
                    />
                  </div>

                  <Input
                    type="text"
                    label="Landmark (Optional)"
                    placeholder="e.g. near Bus Stand"
                    value={deliveryLandmark}
                    onChange={e => setDeliveryLandmark(e.target.value)}
                    className="py-1.5 text-white"
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#a1a1aa] block mb-1.5 uppercase tracking-wider">Village / Town</label>
                    {restaurant?.settings?.delivery?.places && restaurant.settings.delivery.places.length > 0 ? (
                      <select
                        value={deliveryTown}
                        onChange={e => setDeliveryTown(e.target.value)}
                        className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#22c55e]"
                      >
                        <option value="" className="bg-[#111111] text-white">Select Village/Town</option>
                        {restaurant.settings.delivery.places.map((p: any, idx: number) => (
                          <option key={idx} value={p.place} className="bg-[#111111] text-white">
                            {p.place} (+{restaurant?.currency || '₹'}{p.fee})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        type="text"
                        placeholder="e.g. Town Name"
                        value={deliveryTown}
                        onChange={e => setDeliveryTown(e.target.value)}
                        className="py-1.5 text-white"
                      />
                    )}
                  </div>
                </div>
              )}

              <Input
                type="text"
                label="Customer Name (Optional)"
                placeholder="e.g. John Doe"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="py-1.5"
              />

              <Input
                type="text"
                label="Special Request Note"
                placeholder="e.g. Make it spicy"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="py-1.5"
              />
            </div>

            {/* Cart Header */}
            <div className="px-4 py-2 bg-[#171717] border-b border-[#2a2a2a] flex items-center justify-between">
              <span className="text-xs font-bold text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Cart Items ({cart.length})
              </span>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] text-[#ef4444] hover:underline flex items-center gap-0.5 font-semibold"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Cart List */}
            <div className="px-4 py-2 space-y-2">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center py-8 text-[#52525b]">
                  <ShoppingBag className="w-8 h-8 mb-2 opacity-30" />
                  <p className="text-xs">Cart is empty.</p>
                  <p className="text-[10px] mt-1">Select items from the menu list.</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.itemId} className="flex items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${item.isVeg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                        <p className="text-white font-medium truncate leading-tight">{item.name}</p>
                      </div>
                      <p className="text-[#a1a1aa] font-semibold mt-0.5">
                        {item.qty} × {restaurant?.currency ?? '₹'}{item.price}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-white font-bold text-right shrink-0">
                        {restaurant?.currency ?? '₹'}{item.price * item.qty}
                      </span>
                      <button
                        onClick={() => removeItem(item.itemId)}
                        className="p-1 rounded text-[#52525b] hover:text-[#ef4444] hover:bg-[#251010] transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>

          {/* Sticky Bottom Area (Overrides & Pricing) */}
          <div className="border-t border-[#2a2a2a] bg-[#141414] shrink-0">
            
            {/* Quick Override Settings */}
            <div className="p-4 border-b border-[#2a2a2a] space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="auto-accept" className="text-[#a1a1aa] font-medium cursor-pointer">Auto-Accept (Kitchen queue)</label>
                <input
                  id="auto-accept"
                  type="checkbox"
                  checked={autoAccept}
                  onChange={e => setAutoAccept(e.target.checked)}
                  className="w-4 h-4 text-[#22c55e] bg-[#1a1a1a] border-[#2a2a2a] rounded focus:ring-0 cursor-pointer accent-[#22c55e]"
                />
              </div>
            </div>

            {/* Cart Pricing summary */}
            <div className="p-4 space-y-1.5 text-xs text-[#a1a1aa]">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-white font-medium">{restaurant?.currency ?? '₹'}{cartTotal}</span>
              </div>
              {orderType === 'delivery' && (
                <div className="flex justify-between text-[11px] text-[#71717a]">
                  <span>Delivery Fee</span>
                  <span>{restaurant?.currency ?? '₹'}{taxDetails.deliveryFee}</span>
                </div>
              )}
              {taxDetails.cgstEnabled && (
                <div className="flex justify-between text-[11px] text-[#71717a]">
                  <span>CGST ({taxDetails.cgstPercent}%)</span>
                  <span>{restaurant?.currency ?? '₹'}{taxDetails.cgstAmount}</span>
                </div>
              )}
              {taxDetails.sgstEnabled && (
                <div className="flex justify-between text-[11px] text-[#71717a]">
                  <span>SGST ({taxDetails.sgstPercent}%)</span>
                  <span>{restaurant?.currency ?? '₹'}{taxDetails.sgstAmount}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-white border-t border-[#2a2a2a] pt-2 mt-1">
                <span>Total Amount</span>
                <span className="text-[#22c55e]">{restaurant?.currency ?? '₹'}{taxDetails.totalAmount}</span>
              </div>

              <Button
                className="w-full mt-4 bg-[#22c55e] text-black hover:bg-[#1ea34d] font-bold text-xs uppercase tracking-wider py-2.5 flex items-center justify-center gap-1.5 border-none"
                onClick={handlePlaceOrder}
                disabled={placing || cart.length === 0}
              >
                {placing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Placing...
                  </>
                ) : (
                  <>Place Order</>
                )}
              </Button>
            </div>

          </div>

        </div>

      </div>
    </Modal>
  );
}
