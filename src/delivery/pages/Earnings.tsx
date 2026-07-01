import { StatCard } from '../components/StatCard';
import { EarningsCard } from '../components/EarningsCard';
import type { Order } from '../../types';
import type { DeliveryBoy } from '../types';
import { DollarSign, Clock, TrendingUp } from 'lucide-react';

interface EarningsProps {
  profile: DeliveryBoy | null;
  myOrders: Order[];
  currency: string;
}

export default function Earnings({ profile, myOrders, currency }: EarningsProps) {
  if (!profile) return null;

  const completedDeliveries = myOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
  
  const now = Date.now();
  const dayStart = new Date().setHours(0, 0, 0, 0);
  const weekStart = now - 7 * 24 * 3600 * 1000;
  const monthStart = now - 30 * 24 * 3600 * 1000;

  // Earnings calculations
  const todayEarnings = completedDeliveries
    .filter(o => {
      const timeMs = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.() || Date.now();
      return timeMs >= dayStart;
    })
    .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  const weeklyEarnings = completedDeliveries
    .filter(o => {
      const timeMs = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.() || Date.now();
      return timeMs >= weekStart;
    })
    .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  const monthlyEarnings = completedDeliveries
    .filter(o => {
      const timeMs = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.() || Date.now();
      return timeMs >= monthStart;
    })
    .reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // Average Delivery Time
  let totalTimeMs = 0;
  let timedDeliveriesCount = 0;
  
  completedDeliveries.forEach(o => {
    const pickedUp = o.timeline?.pickedUpAt?.toMillis?.() || o.timeline?.acceptedAt?.toMillis?.();
    const delivered = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.();
    if (pickedUp && delivered && delivered > pickedUp) {
      totalTimeMs += (delivered - pickedUp);
      timedDeliveriesCount++;
    }
  });

  const averageTimeMin = timedDeliveriesCount > 0 
    ? Math.round(totalTimeMs / timedDeliveriesCount / 60000) 
    : 24; // Fallback to 24 mins

  return (
    <div className="space-y-5 text-left text-premium-text select-none">
      <div>
        <h2 className="text-xl font-extrabold text-premium-text">Earnings Analytics</h2>
        <p className="text-xs text-premium-muted mt-0.5">Track your delivery payouts and performance.</p>
      </div>

      {/* Grid of stats */}
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard
          title="Today's Earnings"
          value={`${currency}${todayEarnings}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Weekly Earnings"
          value={`${currency}${weeklyEarnings}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Monthly Earnings"
          value={`${currency}${monthlyEarnings}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="purple"
        />
        <StatCard
          title="Avg Delivery Time"
          value={`${averageTimeMin} mins`}
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
      </div>

      {/* Recent payouts section */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold text-premium-muted uppercase tracking-wider">Recent Deliveries ({completedDeliveries.length})</h4>
        
        {completedDeliveries.length === 0 ? (
          <div className="bg-premium-card border border-premium-border rounded-[16px] p-6 text-center text-premium-muted text-xs font-semibold shadow-premium">
            No completed delivery payments recorded yet.
          </div>
        ) : (
          <div className="space-y-3 w-full animate-fadeIn">
            {completedDeliveries.slice(0, 10).map(order => (
              <EarningsCard
                key={order.id}
                order={order}
                currency={currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
