import { useEffect, useState } from 'react';
import { ClipboardList, MapPin, Phone, CheckCircle, Navigation, Loader2 } from 'lucide-react';
import { collection, query, where, onSnapshot, doc, runTransaction, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { Order } from '../../types';

export default function RiderDashboard() {
  const { restaurantId, restaurant, user } = useAuthContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Subscribe to all delivery orders of the restaurant
  useEffect(() => {
    if (!restaurantId) return;

    const q = query(
      collection(db, 'restaurants', restaurantId, 'orders'),
      where('orderType', '==', 'delivery')
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Order));
      setOrders(list);
      setLoading(false);
    }, (err) => {
      console.error('Rider orders subscription error:', err);
      setLoading(false);
    });

    return unsub;
  }, [restaurantId]);

  const availableOrders = orders.filter(
    o => o.status === 'ready' && (!o.assignedRiderId)
  );

  const activeDeliveries = orders.filter(
    o => o.status === 'out_for_delivery' && o.assignedRiderId === user?.uid
  );

  // Transaction for self-assignment
  async function handleAcceptPickup(order: Order) {
    if (!restaurantId || !user?.uid) return;
    setProcessingId(order.id);
    
    try {
      const orderRef = doc(db, 'restaurants', restaurantId, 'orders', order.id);
      
      await runTransaction(db, async (transaction) => {
        const orderSnap = await transaction.get(orderRef);
        if (!orderSnap.exists()) {
          throw new Error('Order not found');
        }
        
        const data = orderSnap.data();
        if (data.status !== 'ready') {
          throw new Error('Order is no longer ready for pickup');
        }
        if (data.assignedRiderId) {
          throw new Error('Order has already been assigned to another rider');
        }

        const riderRef = doc(db, 'deliveryBoys', user.uid);
        const riderSnap = await transaction.get(riderRef);
        const riderName = riderSnap.exists() ? (riderSnap.data()?.name || user.displayName || 'Rider') : (user.displayName || 'Rider');

        transaction.update(orderRef, {
          assignedRiderId: user.uid,
          assignedRiderName: riderName,
          status: 'out_for_delivery',
          updatedAt: Timestamp.now(),
          'timeline.pickedUpAt': Timestamp.now()
        });
      });

      toast.success('Pickup accepted! Order is now in your active list.');
      setActiveTab('active');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to accept pickup');
    } finally {
      setProcessingId(null);
    }
  }

  // Update status to delivered
  async function handleMarkDelivered(order: Order) {
    if (!restaurantId) return;
    setProcessingId(order.id);

    try {
      const { updateOrderStatusAndAnalytics } = await import('../../firebase/analyticsDb');
      await updateOrderStatusAndAnalytics(restaurantId, order.id, 'delivered');
      toast.success('Order marked as delivered! Good job.');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-slate-900 dark:text-premium-text transition-colors duration-200">
      <AdminHeader title="Rider Dashboard" />
      
      <div className="p-6 space-y-5">
        {/* Navigation Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('available')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition relative ${
              activeTab === 'available'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'bg-slate-100 dark:bg-premium-card text-slate-650 dark:text-premium-muted border border-slate-200 dark:border-premium-border hover:text-slate-950 dark:hover:text-premium-text'
            }`}
          >
            Available Pickups
            {availableOrders.length > 0 && (
              <span className="ml-2 bg-[#ef4444] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {availableOrders.length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('active')}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition relative ${
              activeTab === 'active'
                ? 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold'
                : 'bg-slate-100 dark:bg-premium-card text-slate-650 dark:text-premium-muted border border-slate-200 dark:border-premium-border hover:text-slate-950 dark:hover:text-premium-text'
            }`}
          >
            Active Deliveries
            {activeDeliveries.length > 0 && (
              <span className="ml-2 bg-[#22c55e] text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                {activeDeliveries.length}
              </span>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-[#22c55e]" />
          </div>
        ) : activeTab === 'available' ? (
          /* Available Pickups list */
          availableOrders.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl shadow-sm">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-[#2a2a2a] mx-auto mb-3" />
              <p className="text-slate-500 dark:text-premium-muted text-sm font-medium">No pickup jobs available</p>
              <p className="text-slate-400 dark:text-premium-muted text-xs mt-1">Orders ready for dispatch will appear here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {availableOrders.map(order => (
                <div key={order.id} className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl p-5 flex flex-col gap-4 text-left shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-[#22c55e] uppercase tracking-wide">Ready for Pickup</span>
                      <h4 className="text-slate-900 dark:text-premium-text font-bold text-base mt-0.5">Order #{order.dailyOrderId || order.id.slice(0, 6)}</h4>
                    </div>
                    <span className="text-slate-900 dark:text-premium-text font-bold text-base font-mono">{formatCurrency(order.totalAmount, restaurant?.currency || '₹')}</span>
                  </div>

                  {order.address && (
                    <div className="space-y-2 text-xs text-slate-500 dark:text-premium-muted bg-slate-50 dark:bg-premium-bg p-3 rounded-lg border border-slate-250 dark:border-premium-border/40">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-premium-text">
                        <MapPin className="w-3.5 h-3.5 text-[#22c55e]" />
                        <span>Delivery Address</span>
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-premium-text mt-1">{order.address.name} ({order.address.phone})</p>
                      <p className="leading-relaxed">{order.address.address}</p>
                      <p>{order.address.town} - {order.address.pincode}</p>
                    </div>
                  )}

                  <button
                    onClick={() => handleAcceptPickup(order)}
                    disabled={processingId === order.id}
                    className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {processingId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Accept & Pickup Order'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Active Deliveries list */
          activeDeliveries.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl shadow-sm">
              <Navigation className="w-12 h-12 text-slate-350 dark:text-[#2a2a2a] mx-auto mb-3 animate-pulse" />
              <p className="text-slate-500 dark:text-premium-muted text-sm font-medium">No active deliveries</p>
              <p className="text-slate-400 dark:text-premium-muted text-xs mt-1">Accept a pickup from the available list to start.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeDeliveries.map(order => (
                <div key={order.id} className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl p-5 flex flex-col gap-4 text-left shadow-sm">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-pink-500 uppercase tracking-wide">Out for Delivery</span>
                      <h4 className="text-slate-900 dark:text-premium-text font-bold text-base mt-0.5">Order #{order.dailyOrderId || order.id.slice(0, 6)}</h4>
                    </div>
                    <span className="text-slate-900 dark:text-premium-text font-bold text-base font-mono">{formatCurrency(order.totalAmount, restaurant?.currency || '₹')}</span>
                  </div>

                  {order.address && (
                    <div className="space-y-3 text-xs text-slate-500 dark:text-premium-muted bg-slate-50 dark:bg-premium-bg p-4.5 rounded-lg border border-slate-250 dark:border-premium-border/40">
                      <div className="flex items-center justify-between border-b border-slate-200 dark:border-premium-border/30 pb-2">
                        <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-premium-text">
                          <MapPin className="w-3.5 h-3.5 text-pink-500" />
                          <span>Recipient Info</span>
                        </div>
                        <a 
                          href={`tel:${order.address.phone}`} 
                          className="flex items-center gap-1 bg-[#22c55e]/15 border border-[#22c55e]/30 text-[#22c55e] hover:bg-[#22c55e]/25 text-[10px] font-bold px-2.5 py-1 rounded"
                        >
                          <Phone className="w-3 h-3" /> Call
                        </a>
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 dark:text-premium-text text-sm">{order.address.name}</p>
                        <p className="leading-relaxed mt-1 text-slate-700 dark:text-[#e1e1e6]">{order.address.address}</p>
                        {order.address.landmark && (
                          <p className="text-amber-500 mt-1 font-semibold">Landmark: {order.address.landmark}</p>
                        )}
                        <p className="mt-1 font-medium">{order.address.town} - {order.address.pincode}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={() => handleMarkDelivered(order)}
                    disabled={processingId === order.id}
                    className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  >
                    {processingId === order.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" /> Mark as Delivered
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
