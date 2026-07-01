import { useState } from 'react';
import { DeliveryCard } from '../components/DeliveryCard';
import type { Order } from '../../types';
import type { DeliveryBoy } from '../types';
import { ShoppingBag, Truck, CheckCircle2 } from 'lucide-react';

interface MyDeliveriesProps {
  profile: DeliveryBoy | null;
  myOrders: Order[];
  currency: string;
}

export default function MyDeliveries({ profile, myOrders, currency }: MyDeliveriesProps) {
  const [subTab, setSubTab] = useState<'transit' | 'completed'>('transit');

  if (!profile) return null;

  // Filter orders by sub-section
  const transitOrders = myOrders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery');
  
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const completedTodayOrders = myOrders.filter(o => {
    const isCompleted = o.status === 'delivered' || o.status === 'completed';
    if (!isCompleted) return false;
    const timeMs = o.timeline?.deliveredAt?.toMillis?.() || o.updatedAt?.toMillis?.() || Date.now();
    return timeMs >= todayStart.getTime();
  });

  const counts = {
    transit: transitOrders.length,
    completed: completedTodayOrders.length
  };

  const activeOrders = 
    subTab === 'transit' ? transitOrders :
    completedTodayOrders;

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="text-xl font-extrabold text-white">My Deliveries</h2>
        <p className="text-xs text-[#71717a] mt-0.5">Manage your assigned and completed tasks.</p>
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2 bg-[#111111] border border-[#2a2a2a] p-1.5 rounded-2xl">
        <button
          onClick={() => setSubTab('transit')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            subTab === 'transit'
              ? 'bg-[#22c55e] text-black shadow-md'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          <Truck className="w-3.5 h-3.5" />
          <span>Transit</span>
          {counts.transit > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${subTab === 'transit' ? 'bg-black text-[#22c55e]' : 'bg-[#2a2a2a] text-white'}`}>
              {counts.transit}
            </span>
          )}
        </button>

        <button
          onClick={() => setSubTab('completed')}
          className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 ${
            subTab === 'completed'
              ? 'bg-[#22c55e] text-black shadow-md'
              : 'text-[#a1a1aa] hover:text-white'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>History</span>
          {counts.completed > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-extrabold ${subTab === 'completed' ? 'bg-black text-[#22c55e]' : 'bg-[#2a2a2a] text-white'}`}>
              {counts.completed}
            </span>
          )}
        </button>
      </div>

      {activeOrders.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] border border-[#2a2a2a] rounded-2xl">
          <ShoppingBag className="w-14 h-14 text-[#2a2a2a] mx-auto mb-4" />
          <h4 className="text-white font-extrabold text-sm">No tasks in this category</h4>
          <p className="text-xs text-[#52525b] mt-1">Assignments will appear under their respective status tabs.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map(order => (
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
  );
}
