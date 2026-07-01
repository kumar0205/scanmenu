import { useState, useEffect } from 'react';
import { FilterBar, type SortType } from '../components/FilterBar';
import { OrderCard } from '../components/OrderCard';
import { getRestaurantDetails } from '../firebase/riderDb';
import type { Order } from '../../types';
import type { DeliveryBoy } from '../types';
import { ClipboardList, Power } from 'lucide-react';

interface AvailableOrdersProps {
  profile: DeliveryBoy | null;
  availableOrders: Order[];
  currency: string;
}

export default function AvailableOrders({ profile, availableOrders, currency }: AvailableOrdersProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [sortBy, setSortBy] = useState<SortType>('newest');
  const [restaurantCache, setRestaurantCache] = useState<Record<string, any>>({});

  // Simple tick to trigger re-renders for hybrid dispatch timers
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 5000);
    return () => clearInterval(timer);
  }, []);

  // Fetch and cache restaurant configs to filter by delivery configuration
  useEffect(() => {
    const uniqueIds = Array.from(new Set(availableOrders.map(o => (o as any).restaurantId).filter(Boolean)));
    
    uniqueIds.forEach(id => {
      if (restaurantCache[id] !== undefined) return; // Already caching or cached
      
      getRestaurantDetails(id)
        .then(res => {
          setRestaurantCache(prev => ({ ...prev, [id]: res || null }));
        })
        .catch(err => {
          console.error('Error caching restaurant details:', err);
          setRestaurantCache(prev => ({ ...prev, [id]: null }));
        });
    });
  }, [availableOrders]);

  if (!profile) return null;

  if (!profile.isOnline) {
    return (
      <div className="text-center py-20 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 space-y-4">
        <Power className="w-16 h-16 text-[#2a2a2a] mx-auto animate-pulse" />
        <h3 className="text-white font-extrabold text-base">You are Offline</h3>
        <p className="text-xs text-[#a1a1aa] max-w-sm mx-auto leading-relaxed">
          Please turn your status toggle to **ONLINE** on the dashboard to view and accept delivery tasks.
        </p>
      </div>
    );
  }

  // Filter orders by restaurant delivery setting & search query & town
  const validOrders = availableOrders.filter(order => {
    const restaurantId = (order as any).restaurantId || '';
    const restaurant = restaurantCache[restaurantId];
    
    // If not loaded yet, assume valid to avoid flicker (or filter once loaded)
    if (restaurant === null) return false;
    if (restaurant) {
      // Check if delivery is enabled in settings
      const deliveryEnabled = restaurant.settings?.ordering?.delivery !== false;
      if (!deliveryEnabled) return false;

      // Reconcile manual / hybrid assignment modes
      const mode = restaurant.settings?.ordering?.assignmentMode || 'self';
      if (mode === 'owner') {
        return false;
      }
      if (mode === 'hybrid') {
        if ((order as any).broadcastRiderClaim === true) {
          // Allowed immediately
        } else {
          const readyAt = order.timeline?.readyAt?.toMillis?.() || order.createdAt?.toMillis?.() || Date.now();
          const secondsElapsed = (Date.now() - readyAt) / 1000;
          if (secondsElapsed < 30) {
            return false;
          }
        }
      }
    }

    // Search query matches restaurant name or order ID
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const restName = restaurant?.name?.toLowerCase() || '';
      const orderId = order.id.toLowerCase();
      const dailyId = String(order.dailyOrderId || '');
      if (!restName.includes(q) && !orderId.includes(q) && !dailyId.includes(q)) {
        return false;
      }
    }

    // Town filter
    if (selectedTown && order.address?.town !== selectedTown) {
      return false;
    }

    return true;
  });

  // Extract unique towns for filter list
  const towns = Array.from(
    new Set(
      availableOrders
        .map(o => o.address?.town)
        .filter(Boolean)
    )
  ) as string[];

  // Sort orders
  const sortedOrders = [...validOrders].sort((a, b) => {
    const timeA = a.timeline?.readyAt?.toMillis?.() || a.createdAt?.toMillis?.() || Date.now();
    const timeB = b.timeline?.readyAt?.toMillis?.() || b.createdAt?.toMillis?.() || Date.now();

    if (sortBy === 'oldest_ready') {
      return timeA - timeB;
    }
    if (sortBy === 'highest_value') {
      return b.totalAmount - a.totalAmount;
    }
    if (sortBy === 'nearest') {
      // Manual/distance sorting fallback
      return timeB - timeA;
    }
    // 'newest' default
    return timeB - timeA;
  });

  return (
    <div className="space-y-4 text-left">
      <div>
        <h2 className="text-xl font-extrabold text-white">Available Deliveries</h2>
        <p className="text-xs text-[#71717a] mt-0.5">Find nearby ready deliveries to dispatch.</p>
      </div>

      <FilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedTown={selectedTown}
        onTownChange={setSelectedTown}
        towns={towns}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {sortedOrders.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] border border-[#2a2a2a] rounded-2xl">
          <ClipboardList className="w-14 h-14 text-[#2a2a2a] mx-auto mb-4" />
          <h4 className="text-white font-extrabold text-sm">No Available Deliveries</h4>
          <p className="text-xs text-[#52525b] mt-1">Ready orders matching your criteria will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedOrders.map(order => (
            <OrderCard
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
