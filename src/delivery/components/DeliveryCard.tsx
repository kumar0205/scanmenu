import { useEffect, useState } from 'react';
import { getRestaurantDetails, updateDeliveryStatus } from '../firebase/riderDb';
import type { Order } from '../../types';
import { StatusBadge } from './StatusBadge';
import { formatCurrency } from '../../utils/formatters';
import { MapPin, Phone, CheckCircle, Navigation, Loader2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

interface DeliveryCardProps {
  order: Order & { restaurantId?: string };
  riderUid: string;
  currency: string;
}

export function DeliveryCard({ order, riderUid, currency }: DeliveryCardProps) {
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const restaurantId = order.restaurantId || '';

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantDetails(restaurantId)
      .then(res => {
        if (res) setRestaurant(res);
      })
      .catch(err => console.error('Error fetching restaurant details:', err));
  }, [restaurantId]);

  async function handleStatusTransition(e: React.MouseEvent) {
    e.stopPropagation(); // Avoid triggering card click navigation
    if (!restaurantId) return;
    
    setUpdating(true);
    const nextStatus = order.status === 'ready' ? 'out_for_delivery' : 'delivered';
    
    try {
      await updateDeliveryStatus(restaurantId, order.id, nextStatus, riderUid, order.deliveryFee || 0);
      toast.success(nextStatus === 'out_for_delivery' ? 'Status updated: Out for Delivery!' : 'Status updated: Delivered successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  function handleButtonClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (order.status === 'ready') {
      handleStatusTransition(e);
    } else {
      navigate(`/admin/rider/delivery/${order.id}`, { state: { restaurantId } });
    }
  }

  return (
    <div 
      onClick={() => navigate(`/admin/rider/delivery/${order.id}`, { state: { restaurantId } })}
      className="bg-premium-card border border-premium-border rounded-[16px] p-5 flex flex-col gap-4 text-left hover:border-premium-primary/30 transition duration-200 cursor-pointer group active:scale-[0.99] shadow-premium"
    >
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] text-premium-muted font-bold uppercase tracking-wider block">
            Restaurant: {restaurant?.name || 'Loading...'}
          </span>
          <h4 className="text-premium-text font-extrabold text-base mt-1.5">
            Order #{order.dailyOrderId || order.id.slice(0, 6)}
          </h4>
        </div>
        <div className="flex flex-col items-end gap-1.5 select-none">
          <StatusBadge status={order.status} />
          <span className="text-premium-text font-extrabold font-mono text-sm">
            {formatCurrency(order.totalAmount, currency)}
          </span>
        </div>
      </div>

      {order.address && (
        <div className="space-y-1.5 text-xs text-premium-muted bg-premium-bg border border-premium-border/40 p-3.5 rounded-xl">
          <div className="flex items-center justify-between border-b border-premium-border/30 pb-2">
            <div className="flex items-center gap-1.5 font-bold text-premium-text">
              <MapPin className="w-3.5 h-3.5 text-premium-primary" />
              <span>Delivery Info</span>
            </div>
            <a 
              href={`tel:${order.address.phone}`}
              onClick={(e) => e.stopPropagation()} 
              className="flex items-center gap-1 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/25 text-[10px] font-extrabold px-2.5 py-1 rounded-lg"
            >
              <Phone className="w-3 h-3" /> Call
            </a>
          </div>
          <div>
            <p className="font-extrabold text-premium-text">{order.address.name}</p>
            <p className="leading-relaxed mt-0.5 font-medium">{order.address.address}, {order.address.street}</p>
            <p className="mt-0.5 font-medium">{order.address.town}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2.5 mt-1 items-center select-none">
        {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled' ? (
          <button
            onClick={handleButtonClick}
            disabled={updating}
            className="flex-1 bg-premium-success hover:bg-green-600 disabled:opacity-50 text-premium-bg font-extrabold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
          >
            {updating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : order.status === 'ready' ? (
              <>
                <Navigation className="w-4 h-4" /> Start Out For Delivery
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" /> Collect Payment & Deliver
              </>
            )}
          </button>
        ) : (
          <div className="flex-1 text-xs font-bold text-premium-muted py-3 text-center border border-premium-border/40 rounded-xl bg-premium-bg">
            Delivery Completed
          </div>
        )}

        <button 
          className="w-11 h-11 bg-premium-bg hover:bg-premium-hover border border-premium-border text-premium-text rounded-xl flex items-center justify-center transition duration-200"
          aria-label="View Details"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
