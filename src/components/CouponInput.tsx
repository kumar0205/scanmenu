import { useState } from 'react';
import { Tag, Loader2, Check, X } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import toast from 'react-hot-toast';

interface CouponInputProps {
  restaurantId: string;
  cartTotal: number;
  onApplyCoupon: (coupon: any | null, discountAmount: number) => void;
  appliedCoupon: any | null;
}

export function CouponInput({ restaurantId, cartTotal, onApplyCoupon, appliedCoupon }: CouponInputProps) {
  const [couponCode, setCouponCode] = useState('');
  const [checking, setChecking] = useState(false);

  async function handleApply() {
    const code = couponCode.trim().toLowerCase();
    if (!code) {
      toast.error('Please enter a coupon code');
      return;
    }

    setChecking(true);
    try {
      const couponDocRef = doc(db, 'restaurants', restaurantId, 'coupons', code);
      const couponSnap = await getDoc(couponDocRef);

      if (!couponSnap.exists()) {
        toast.error('Invalid coupon code');
        onApplyCoupon(null, 0);
        return;
      }

      const data = couponSnap.data();
      
      // 1. Validation Checks
      if (!data.isActive) {
        toast.error('Coupon is no longer active');
        onApplyCoupon(null, 0);
        return;
      }

      if (data.expiryDate && data.expiryDate.toMillis() < Date.now()) {
        toast.error('Coupon has expired');
        onApplyCoupon(null, 0);
        return;
      }

      if (data.minOrderAmount && cartTotal < data.minOrderAmount) {
        toast.error(`Minimum order amount of ₹${data.minOrderAmount} required`);
        onApplyCoupon(null, 0);
        return;
      }

      if (data.usageLimit !== undefined && data.usedCount !== undefined && data.usedCount >= data.usageLimit) {
        toast.error('Coupon usage limit reached');
        onApplyCoupon(null, 0);
        return;
      }

      if (data.restaurantId !== restaurantId) {
        toast.error('Invalid coupon for this restaurant');
        onApplyCoupon(null, 0);
        return;
      }

      // Calculate Discount
      let discount = 0;
      if (data.discountType === 'percentage') {
        discount = Math.round(cartTotal * (data.discountValue / 100));
        if (data.maxDiscountAmount && discount > data.maxDiscountAmount) {
          discount = data.maxDiscountAmount;
        }
      } else {
        discount = data.discountValue;
      }

      onApplyCoupon({ ...data, code }, discount);
      toast.success('Coupon applied successfully!');
    } catch (err: any) {
      console.error('Error applying coupon:', err);
      toast.error('Failed to validate coupon. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  function handleRemove() {
    onApplyCoupon(null, 0);
    setCouponCode('');
    toast.success('Coupon removed');
  }

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-3.5 space-y-2.5 text-left">
      <div className="flex items-center gap-1.5 text-stone-850 font-bold text-xs uppercase tracking-wider">
        <Tag className="w-3.5 h-3.5 text-amber-600" />
        <span>Promo Coupons</span>
      </div>

      {appliedCoupon ? (
        <div className="flex items-center justify-between bg-emerald-50 border border-emerald-250 p-2.5 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-emerald-600 text-white rounded-full flex items-center justify-center text-[10px]">
              <Check className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-xs uppercase tracking-wide text-emerald-800 font-mono">
                {appliedCoupon.code}
              </span>
              <span className="text-[10px] text-emerald-700 ml-1.5 font-medium">Applied!</span>
            </div>
          </div>
          <button
            onClick={handleRemove}
            className="text-stone-400 hover:text-stone-600 transition"
            aria-label="Remove coupon"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Enter Promo Code"
            value={couponCode}
            onChange={e => setCouponCode(e.target.value)}
            className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs font-mono uppercase focus:outline-none focus:border-amber-500 focus:bg-white text-stone-900"
          />
          <button
            onClick={handleApply}
            disabled={checking || !couponCode.trim()}
            className="bg-stone-900 hover:bg-stone-850 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition disabled:opacity-50 flex items-center gap-1.5 min-w-[70px] justify-center"
          >
            {checking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Apply'}
          </button>
        </div>
      )}
    </div>
  );
}
