import { formatCurrency } from '../utils/formatters';

interface DeliveryFeeCardProps {
  cartTotal: number;
  platformFee: number;
  deliveryFee: number;
  taxConfig?: {
    cgstEnabled: boolean;
    cgstPercent: number;
    sgstEnabled: boolean;
    sgstPercent: number;
  };
  couponDiscount: number;
  currency: string;
}

export function DeliveryFeeCard({
  cartTotal,
  platformFee,
  deliveryFee,
  taxConfig,
  couponDiscount,
  currency
}: DeliveryFeeCardProps) {
  // Taxes Calculation
  const cgstRate = taxConfig?.cgstEnabled ? taxConfig.cgstPercent / 100 : 0;
  const sgstRate = taxConfig?.sgstEnabled ? taxConfig.sgstPercent / 100 : 0;
  
  const cgstAmount = Math.round(cartTotal * cgstRate * 100) / 100;
  const sgstAmount = Math.round(cartTotal * sgstRate * 100) / 100;
  const totalTaxes = cgstAmount + sgstAmount;

  // Grand Total calculation
  const grandTotal = Math.max(0, cartTotal + platformFee + deliveryFee + totalTaxes - couponDiscount);

  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2.5 text-left text-xs text-stone-600 shadow-sm">
      <h4 className="font-bold text-stone-900 text-sm border-b border-stone-100 pb-2 mb-1.5 uppercase tracking-wide">
        Billing Details
      </h4>

      <div className="flex justify-between">
        <span>Cart Subtotal</span>
        <span className="font-semibold text-stone-900">{formatCurrency(cartTotal, currency)}</span>
      </div>

      {deliveryFee > 0 && (
        <div className="flex justify-between">
          <span>Delivery Charges</span>
          <span className="font-semibold text-stone-900">{formatCurrency(deliveryFee, currency)}</span>
        </div>
      )}

      {platformFee > 0 && (
        <div className="flex justify-between">
          <span>Platform Fee</span>
          <span className="font-semibold text-stone-900">{formatCurrency(platformFee, currency)}</span>
        </div>
      )}

      {cgstAmount > 0 && (
        <div className="flex justify-between">
          <span>CGST ({taxConfig!.cgstPercent}%)</span>
          <span className="font-semibold text-stone-900">{formatCurrency(cgstAmount, currency)}</span>
        </div>
      )}

      {sgstAmount > 0 && (
        <div className="flex justify-between">
          <span>SGST ({taxConfig!.sgstPercent}%)</span>
          <span className="font-semibold text-stone-900">{formatCurrency(sgstAmount, currency)}</span>
        </div>
      )}

      {couponDiscount > 0 && (
        <div className="flex justify-between text-emerald-600 font-medium">
          <span>Promo Discount</span>
          <span>-{formatCurrency(couponDiscount, currency)}</span>
        </div>
      )}

      <div className="flex justify-between text-sm font-bold text-stone-900 pt-2 border-t border-dashed border-stone-200">
        <span>To Pay</span>
        <span>{formatCurrency(grandTotal, currency)}</span>
      </div>
    </div>
  );
}
