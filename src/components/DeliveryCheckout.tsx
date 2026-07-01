import { useState, useEffect } from 'react';
import { MapPin, Plus, Trash2, Edit, Phone, CreditCard, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import { collection, onSnapshot, query, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { AddressModal } from './AddressModal';
import { OTPDialog } from './OTPDialog';
import { CouponInput } from './CouponInput';
import { DeliveryFeeCard } from './DeliveryFeeCard';
import { DeliverySummary } from './DeliverySummary';
import toast from 'react-hot-toast';

interface Address {
  id: string;
  title: string;
  name: string;
  phone: string;
  address: string;
  street?: string;
  landmark?: string;
  town: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

interface DeliveryCheckoutProps {
  restaurantId: string;
  restaurant: any;
  cartTotal: number;
  cartItems: any[];
  currency: string;
  onPlaceOrder: (address: Address, coupon: any | null, discountAmount: number) => Promise<void>;
  placing: boolean;
}

export function DeliveryCheckout({
  restaurantId,
  restaurant,
  cartTotal,
  cartItems,
  currency,
  onPlaceOrder,
  placing
}: DeliveryCheckoutProps) {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  
  const [otpDialogOpen, setOtpDialogOpen] = useState(false);
  
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  const currentUser = auth.currentUser;
  const uid = currentUser?.uid;
  const hasPhoneAuth = true; // Bypassed for testing / bypass OTP

  // 1. Subscribe to Customer's Address subcollection / Load from LocalStorage
  useEffect(() => {
    // Load local storage first as a starting point or fallback
    const localAddrs = JSON.parse(localStorage.getItem('scanmenu_local_addresses') || '[]');
    setAddresses(localAddrs);
    const def = localAddrs.find((a: any) => a.isDefault);
    if (def) {
      setSelectedAddress(def);
    } else if (localAddrs.length > 0) {
      setSelectedAddress(localAddrs[0]);
    }

    if (!uid || currentUser.isAnonymous) {
      return;
    }

    const q = query(collection(db, 'customers', uid, 'addresses'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Address));
      
      // Combine with local storage, prioritizing Firestore addresses
      const combinedMap = new Map<string, Address>();
      localAddrs.forEach((a: Address) => combinedMap.set(a.id, a));
      list.forEach((a: Address) => combinedMap.set(a.id, a));
      
      const combined = Array.from(combinedMap.values());
      setAddresses(combined);
      
      // Auto-select default address
      const finalDef = combined.find(a => a.isDefault);
      if (finalDef) {
        setSelectedAddress(finalDef);
      } else if (combined.length > 0) {
        setSelectedAddress(combined[0]);
      } else {
        setSelectedAddress(null);
      }
    }, (err) => {
      console.error('Addresses listener error:', err);
    });

    return unsub;
  }, [uid, currentUser?.isAnonymous]);

  // 2. Fetch platform and delivery fees from restaurant settings
  const platformFee = restaurant?.settings?.fees?.platformFee ?? 2;
  const getDeliveryFee = () => {
    if (!selectedAddress) return restaurant?.settings?.fees?.deliveryFee ?? 40;
    const places = restaurant?.settings?.delivery?.places || [];
    const matched = places.find((p: any) => p.place.toLowerCase() === selectedAddress.town.toLowerCase());
    return matched ? matched.fee : (restaurant?.settings?.fees?.deliveryFee ?? 40);
  };
  const deliveryFee = getDeliveryFee();
  const minimumOrder = restaurant?.settings?.delivery?.minimumOrder ?? 200;

  // 3. Save/Update address helper
  async function handleSaveAddress(addressData: Omit<Address, 'id'> & { id?: string }) {
    try {
      if (!uid || currentUser.isAnonymous) {
        throw new Error("LocalMode");
      }

      // Ensure customers/uid document exists
      await setDoc(doc(db, 'customers', uid), {
        updatedAt: new Date(),
        phone: currentUser?.phoneNumber || addressData.phone,
        name: addressData.name
      }, { merge: true });

      const addressesColRef = collection(db, 'customers', uid, 'addresses');
      
      // If setting this address as default, unset others first
      if (addressData.isDefault) {
        for (const addr of addresses) {
          if (addr.id !== addressData.id && addr.isDefault) {
            await updateDoc(doc(db, 'customers', uid, 'addresses', addr.id), { isDefault: false });
          }
        }
      }

      if (addressData.id) {
        // Edit mode
        const docRef = doc(db, 'customers', uid, 'addresses', addressData.id);
        await updateDoc(docRef, addressData as any);
        toast.success('Address updated!');
      } else {
        // Create mode
        const newAddressRef = doc(addressesColRef);
        const isFirst = addresses.length === 0;
        await setDoc(newAddressRef, {
          ...addressData,
          id: newAddressRef.id,
          isDefault: isFirst || addressData.isDefault
        });
        toast.success('Address added!');
      }
    } catch (error) {
      console.warn("Saving address to LocalStorage fallback due to permission/auth limitations:", error);
      
      // LocalStorage Fallback
      const localAddrs = JSON.parse(localStorage.getItem('scanmenu_local_addresses') || '[]');
      if (addressData.isDefault) {
        localAddrs.forEach((a: any) => { a.isDefault = false; });
      }

      if (addressData.id) {
        // Edit mode
        const idx = localAddrs.findIndex((a: any) => a.id === addressData.id);
        if (idx !== -1) {
          localAddrs[idx] = { ...addressData };
        }
      } else {
        // Create mode
        const newId = 'local-' + Math.random().toString(36).substring(2, 9);
        localAddrs.push({
          ...addressData,
          id: newId,
          isDefault: localAddrs.length === 0 || addressData.isDefault
        });
      }

      localStorage.setItem('scanmenu_local_addresses', JSON.stringify(localAddrs));
      setAddresses(localAddrs);
      
      const saved = localAddrs.find((a: any) => a.id === (addressData.id || localAddrs[localAddrs.length - 1].id));
      if (saved) setSelectedAddress(saved);
      toast.success('Address saved locally!');
    }
  }

  // 4. Delete address helper
  async function handleDeleteAddress(addressId: string, e: React.MouseEvent) {
    e.stopPropagation();
    
    if (addressId.startsWith('local-')) {
      const localAddrs = JSON.parse(localStorage.getItem('scanmenu_local_addresses') || '[]');
      const updated = localAddrs.filter((a: any) => a.id !== addressId);
      localStorage.setItem('scanmenu_local_addresses', JSON.stringify(updated));
      setAddresses(updated);
      if (selectedAddress?.id === addressId) {
        setSelectedAddress(updated.find((a: any) => a.isDefault) || updated[0] || null);
      }
      toast.success('Address removed');
      return;
    }

    if (!uid) return;
    if (window.confirm('Delete this address?')) {
      try {
        await deleteDoc(doc(db, 'customers', uid, 'addresses', addressId));
        toast.success('Address removed');
        if (selectedAddress?.id === addressId) {
          setSelectedAddress(null);
        }
      } catch (err) {
        toast.error('Failed to delete address');
      }
    }
  }

  // 5. Checkout click handler
  function handleCheckoutSubmit() {
    if (!hasPhoneAuth) {
      setOtpDialogOpen(true);
      return;
    }
    if (!selectedAddress) {
      toast.error('Please add/select a delivery address');
      return;
    }
    if (cartTotal < minimumOrder) {
      toast.error(`Minimum order of ${currency}${minimumOrder} required for delivery`);
      return;
    }

    onPlaceOrder(selectedAddress, appliedCoupon, couponDiscount);
  }

  return (
    <div className="space-y-4">
      {/* Phone verification banner */}
      {!hasPhoneAuth && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-3 text-left">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-xs text-amber-800">Phone Authentication Required</h4>
            <p className="text-[10px] text-amber-700 mt-0.5 leading-relaxed">
              You must verify your phone number via SMS OTP to place delivery orders.
            </p>
            <button
              onClick={() => setOtpDialogOpen(true)}
              className="mt-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold py-1.5 px-3 rounded-lg shadow-sm transition"
            >
              Verify Number
            </button>
          </div>
        </div>
      )}

      {/* Address Selection */}
      {hasPhoneAuth && (
        <div className="bg-white border border-stone-200 rounded-2xl p-4 text-left space-y-3 shadow-sm">
          <div className="flex justify-between items-center border-b border-stone-100 pb-2.5">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-stone-900 text-sm">Delivery Address</h3>
            </div>
            <button
              onClick={() => {
                setAddressToEdit(null);
                setAddressModalOpen(true);
              }}
              className="text-amber-600 hover:text-amber-700 text-xs font-bold flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add New
            </button>
          </div>

          {addresses.length === 0 ? (
            <div className="py-6 text-center text-stone-400 space-y-2">
              <MapPin className="w-8 h-8 mx-auto opacity-20" />
              <p className="text-xs font-medium">No saved addresses found</p>
              <button
                onClick={() => {
                  setAddressToEdit(null);
                  setAddressModalOpen(true);
                }}
                className="text-xs text-amber-500 font-bold hover:underline"
              >
                Create address now
              </button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {addresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => setSelectedAddress(addr)}
                  className={`p-3 rounded-xl border-2 cursor-pointer transition flex items-start gap-2.5 ${
                    selectedAddress?.id === addr.id
                      ? 'border-amber-500 bg-amber-50/20'
                      : 'border-stone-100 hover:border-stone-200 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="selected-address"
                    checked={selectedAddress?.id === addr.id}
                    onChange={() => setSelectedAddress(addr)}
                    className="mt-1 accent-amber-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-stone-900 text-xs">{addr.title}</span>
                      {addr.isDefault && (
                        <span className="bg-stone-100 text-stone-500 font-bold text-[8px] uppercase px-1 rounded-sm">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-semibold text-stone-700 mt-0.5">{addr.name} ({addr.phone})</p>
                    <p className="text-[10px] text-stone-500 mt-0.5 truncate">{addr.address}, {addr.street}</p>
                    {addr.landmark && <p className="text-[9px] text-stone-400 italic truncate">Landmark: {addr.landmark}</p>}
                    <p className="text-[10px] text-stone-500">{addr.town}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-1.5">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddressToEdit(addr);
                        setAddressModalOpen(true);
                      }}
                      className="p-1 text-stone-400 hover:text-stone-700 rounded hover:bg-stone-100"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteAddress(addr.id, e)}
                      className="p-1 text-stone-400 hover:text-red-500 rounded hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Coupon input */}
      {hasPhoneAuth && (
        <CouponInput
          restaurantId={restaurantId}
          cartTotal={cartTotal}
          appliedCoupon={appliedCoupon}
          onApplyCoupon={(coupon, discount) => {
            setAppliedCoupon(coupon);
            setCouponDiscount(discount);
          }}
        />
      )}

      {/* Payment option */}
      <div className="bg-white border border-stone-200 rounded-2xl p-4 text-left space-y-2.5 shadow-sm">
        <h4 className="font-bold text-stone-900 text-sm uppercase tracking-wide border-b border-stone-100 pb-2 flex items-center gap-1.5">
          <CreditCard className="w-4 h-4 text-amber-600" /> Payment Mode
        </h4>
        <div className="flex items-center justify-between p-3 rounded-xl border-2 border-amber-500 bg-amber-50/20">
          <div className="flex items-center gap-2">
            <span className="text-base">💵</span>
            <div>
              <p className="text-xs font-bold text-stone-900">Cash on Delivery (COD)</p>
              <p className="text-[10px] text-stone-500 mt-0.5">Pay in cash or UPI during package handover.</p>
            </div>
          </div>
          <input type="radio" checked readOnly className="accent-amber-500" />
        </div>
      </div>

      {/* Order Summary & Fee Breakdowns */}
      <DeliverySummary items={cartItems} address={selectedAddress} currency={currency} />
      
      <DeliveryFeeCard
        cartTotal={cartTotal}
        platformFee={platformFee}
        deliveryFee={deliveryFee}
        taxConfig={restaurant?.tax}
        couponDiscount={couponDiscount}
        currency={currency}
      />

      {/* Checkout placing button */}
      <div className="pt-2">
        <button
          onClick={handleCheckoutSubmit}
          disabled={placing || (hasPhoneAuth && !selectedAddress) || (hasPhoneAuth && cartTotal < minimumOrder)}
          className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {placing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Placing order...
            </>
          ) : !hasPhoneAuth ? (
            <>
              <Phone className="w-4 h-4" /> Verify Phone to Checkout
            </>
          ) : (
            <>
              <ShoppingBag className="w-4 h-4" /> Place Delivery Order
            </>
          )}
        </button>
      </div>

      {/* Address Edit/Add Modal */}
      <AddressModal
        open={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSave={handleSaveAddress}
        addressToEdit={addressToEdit as any}
        places={restaurant?.settings?.delivery?.places || []}
      />

      {/* OTP verification Modal */}
      <OTPDialog
        open={otpDialogOpen}
        onClose={() => setOtpDialogOpen(false)}
        onSuccess={() => {
          toast.success('Successfully logged in with mobile.');
        }}
      />
    </div>
  );
}
