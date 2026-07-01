import type { Order } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EarningsCardProps {
  order: Order;
  currency: string;
}

export function EarningsCard({ order, currency }: EarningsCardProps) {
  const navigate = useNavigate();
  const deliveryFee = order.deliveryFee || 0;
  const completedAt = order.timeline?.deliveredAt || order.updatedAt;

  function formatDate(timestamp: any) {
    if (!timestamp) return '';
    const date = typeof timestamp.toMillis === 'function' ? new Date(timestamp.toMillis()) : new Date(timestamp);
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div 
      onClick={() => navigate(`/admin/rider/delivery/${order.id}`)}
      className="bg-premium-card border border-premium-border rounded-[16px] p-4 flex justify-between items-center text-left hover:border-premium-primary/30 transition cursor-pointer active:scale-[0.99] w-full shadow-premium"
    >
      <div className="space-y-1">
        <div className="flex items-center gap-1.5 text-[10px] text-premium-muted font-mono font-bold uppercase tracking-wider">
          <Calendar className="w-3.5 h-3.5 text-premium-primary" />
          <span>{formatDate(completedAt)}</span>
        </div>
        <h4 className="text-premium-text font-extrabold text-sm mt-1">
          Order #{order.dailyOrderId || order.id.slice(0, 6)}
        </h4>
        <p className="text-[10px] text-premium-muted/80 font-semibold mt-0.5">Customer: {order.customerName}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-[10px] text-premium-muted block uppercase font-bold tracking-wider">Payout</span>
          <span className="text-base font-extrabold text-premium-success font-mono">
            {formatCurrency(deliveryFee, currency)}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-premium-bg border border-premium-border text-premium-muted">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
