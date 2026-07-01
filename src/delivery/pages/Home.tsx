import { useNavigate } from 'react-router-dom';
import { StatCard } from '../components/StatCard';
import { OnlineToggle } from '../components/OnlineToggle';
import { DeliveryCard } from '../components/DeliveryCard';
import { Bike, DollarSign, ClipboardCheck, ArrowRight, ShieldCheck } from 'lucide-react';
import type { DeliveryBoy } from '../types';
import type { Order } from '../../types';

interface HomeProps {
  profile: DeliveryBoy | null;
  myOrders: Order[];
  currency: string;
}

export default function Home({ profile, myOrders, currency }: HomeProps) {
  const navigate = useNavigate();

  if (!profile) return null;

  // Filter completed deliveries
  const completedDeliveries = myOrders.filter(o => o.status === 'delivered' || o.status === 'completed');
  
  // Calculate today's dates
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayDeliveries = completedDeliveries.filter(o => {
    const timeMs = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.() || Date.now();
    return timeMs >= todayStart.getTime();
  });

  const todayEarningsVal = todayDeliveries.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);

  // Active deliveries (assigned to this rider and not yet delivered/completed/cancelled)
  const activeDeliveries = myOrders.filter(o => 
    o.status === 'ready' || o.status === 'out_for_delivery'
  );

  return (
    <div className="space-y-5 text-left">
      {/* Header */}
      <div>
        <h2 className="text-xl font-extrabold text-premium-text">Rider Portal</h2>
        <p className="text-xs text-premium-muted mt-0.5">Welcome back, {profile.name}!</p>
      </div>

      {/* Online switch */}
      <OnlineToggle uid={profile.uid} isOnline={profile.isOnline} />

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <StatCard
          title="Today's Payout"
          value={`${currency}${todayEarningsVal}`}
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatCard
          title="Today's Jobs"
          value={todayDeliveries.length}
          icon={<ClipboardCheck className="w-5 h-5" />}
          color="blue"
        />
        <StatCard
          title="Active Jobs"
          value={activeDeliveries.length}
          icon={<Bike className="w-5 h-5" />}
          color="pink"
        />
        <StatCard
          title="Total Jobs"
          value={profile.totalDeliveries || completedDeliveries.length}
          icon={<ShieldCheck className="w-5 h-5" />}
          color="purple"
        />
      </div>

      {/* Active Jobs list */}
      <div className="space-y-3.5">
        <div className="flex justify-between items-center">
          <h4 className="text-xs font-bold text-premium-muted uppercase tracking-wider">Active Tasks ({activeDeliveries.length})</h4>
          {profile.isOnline && (
            <button
              onClick={() => navigate('/admin/rider/available')}
              className="text-xs font-bold text-premium-primary hover:text-blue-400 flex items-center gap-1 transition"
            >
              Find jobs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {activeDeliveries.length === 0 ? (
          <div className="bg-premium-card border border-premium-border rounded-[16px] p-6 text-center space-y-2 shadow-premium">
            <p className="text-premium-text font-semibold text-xs">No active tasks assigned</p>
            {profile.isOnline ? (
              <p className="text-premium-muted text-[10px]">Go to Available Jobs tab to pick up order requests.</p>
            ) : (
              <p className="text-premium-muted text-[10px]">Toggle status to ONLINE to search and accept jobs.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {activeDeliveries.map(order => (
              <DeliveryCard
                key={order.id}
                order={order}
                riderUid={profile.uid}
                currency={currency}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
