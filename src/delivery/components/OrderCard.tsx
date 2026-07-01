import { useEffect, useState } from 'react';
import { getRestaurantDetails, acceptDeliveryOrder } from '../firebase/riderDb';
import type { Order } from '../../types';
import { formatTimeAgo, formatCurrency } from '../../utils/formatters';
import { MapPin, ShoppingBag, Clock, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface OrderCardProps {
  order: Order & { restaurantId?: string };
  riderUid: string;
  onAccepted?: () => void;
  currency: string;
}

export function OrderCard({ order, riderUid, onAccepted, currency }: OrderCardProps) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [accepting, setAccepting] = useState(false);
  const restaurantId = order.restaurantId || '';

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantDetails(restaurantId)
      .then(res => {
        if (res) setRestaurant(res);
      })
      .catch(err => console.error('Error fetching restaurant details:', err));
  }, [restaurantId]);

  const itemsCount = order.items.reduce((sum, item) => sum + item.qty, 0);
  const deliveryFee = order.deliveryFee || 0;
  
  // Ready time
  const readyTime = order.timeline?.readyAt || order.createdAt;

  async function handleAccept() {
    if (!restaurantId) return;
    setAccepting(true);
    try {
      await acceptDeliveryOrder(restaurantId, order.id, riderUid);
      toast.success('Pickup accepted! Drive safely.');
      if (onAccepted) onAccepted();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to accept order');
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="bg-premium-card border border-premium-border rounded-[16px] p-5 flex flex-col gap-4 text-left hover:border-premium-primary/30 transition duration-200 shadow-premium">
      {/* Restaurant Header */}
      <div className="flex items-center gap-3.5 border-b border-premium-border/40 pb-3.5">
        {restaurant?.logoUrl ? (
          <img
            src={restaurant.logoUrl}
            alt={restaurant.name}
            className="w-11 h-11 rounded-xl object-cover border border-premium-border shrink-0"
          />
        ) : (
          <div className="w-11 h-11 rounded-xl bg-premium-bg border border-premium-border flex items-center justify-center shrink-0">
            <ShoppingBag className="w-5 h-5 text-premium-muted" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold text-premium-primary uppercase tracking-wider">Restaurant</p>
          <h4 className="text-premium-text font-extrabold text-sm truncate leading-tight mt-0.5">
            {restaurant?.name || 'Loading restaurant...'}
          </h4>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-premium-muted block uppercase font-bold tracking-wider">Amount</span>
          <span className="text-sm font-extrabold text-premium-text font-mono">
            {formatCurrency(order.totalAmount, currency)}
          </span>
        </div>
      </div>

      {/* Customer Info */}
      {order.address && (
        <div className="space-y-2 text-xs text-premium-muted bg-premium-bg border border-premium-border/40 p-3.5 rounded-xl">
          <div className="flex items-center gap-1.5 font-bold text-premium-text mb-1">
            <MapPin className="w-3.5 h-3.5 text-premium-primary" />
            <span>Customer Address</span>
          </div>
          <p className="font-extrabold text-premium-text">{order.address.name}</p>
          <p className="leading-relaxed mt-0.5 font-medium">{order.address.address}, {order.address.street}</p>
          <p className="mt-0.5 font-medium">{order.address.town}</p>
          {order.address.landmark && (
            <p className="text-[10px] text-premium-warning font-semibold italic mt-1">Landmark: {order.address.landmark}</p>
          )}
        </div>
      )}

      {/* Grid of stats */}
      <div className="grid grid-cols-3 gap-2.5 text-center bg-premium-bg border border-premium-border/40 p-3 rounded-xl">
        <div>
          <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider block">Items</span>
          <span className="text-xs font-extrabold text-premium-text">{itemsCount} Items</span>
        </div>
        <div>
          <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider block">Delivery Fee</span>
          <span className="text-xs font-extrabold text-premium-text font-mono">{formatCurrency(deliveryFee, currency)}</span>
        </div>
        <div>
          <span className="text-[9px] text-premium-muted uppercase font-bold tracking-wider block">Earnings</span>
          <span className="text-xs font-extrabold text-premium-success font-mono">{formatCurrency(deliveryFee, currency)}</span>
        </div>
      </div>

      {/* Footer and Accept button */}
      <div className="flex justify-between items-center mt-1 select-none">
        <div className="flex items-center gap-1.5 text-xs text-premium-muted font-semibold">
          <Clock className="w-3.5 h-3.5 text-premium-primary" />
          <span>Ready {formatTimeAgo(readyTime)}</span>
        </div>

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="bg-premium-success hover:bg-green-600 disabled:opacity-50 text-premium-bg font-extrabold text-xs px-5 py-2.5 rounded-xl transition flex items-center gap-1.5 shadow-premium active:scale-95 touch-manipulation min-h-[40px]"
        >
          {accepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            'Accept Delivery'
          )}
        </button>
      </div>
    </div>
  );
}
