import { formatCurrency } from '../utils/formatters';

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
}

interface CartItem {
  itemId: string;
  name: string;
  price: number;
  qty: number;
  isVeg: boolean;
}

interface DeliverySummaryProps {
  items: CartItem[];
  address: Address | null;
  currency: string;
}

export function DeliverySummary({ items, address, currency }: DeliverySummaryProps) {
  return (
    <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3.5 text-left text-xs shadow-sm">
      {/* Address details */}
      {address && (
        <div className="space-y-1.5">
          <h4 className="font-bold text-stone-905 text-sm uppercase tracking-wide border-b border-stone-100 pb-1.5">
            Deliver To
          </h4>
          <div className="text-stone-605 space-y-1">
            <p className="font-bold text-stone-850">
              {address.title} · {address.name} ({address.phone})
            </p>
            <p className="leading-relaxed">
              {address.address}, {address.street}
            </p>
            {address.landmark && (
              <p className="text-[11px] text-stone-400 italic">
                Landmark: {address.landmark}
              </p>
            )}
            <p className="font-medium">
              {address.town}
            </p>
          </div>
        </div>
      )}

      {/* Items summary list */}
      <div className="space-y-1.5">
        <h4 className="font-bold text-stone-905 text-sm uppercase tracking-wide border-b border-stone-100 pb-1.5 pt-1">
          Items Ordered
        </h4>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between items-center text-stone-600">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={`w-2 h-2 rounded-sm shrink-0 ${item.isVeg ? 'bg-green-600' : 'bg-red-650'}`} />
                <span className="truncate">
                  {item.name} <span className="opacity-75 font-semibold">x{item.qty}</span>
                </span>
              </div>
              <span className="font-semibold text-stone-850 shrink-0">
                {formatCurrency(item.price * item.qty, currency)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
