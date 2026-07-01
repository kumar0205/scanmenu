import { useEffect, useState } from 'react';
import { 
  Bike, Phone, Loader2, Search, MessageSquare, CreditCard, Download
} from 'lucide-react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuthContext } from '../../context/AuthContext';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { formatCurrency } from '../../utils/formatters';
import { recordRiderSettlement } from '../../delivery/firebase/riderDb';
import type { Order } from '../../types';
import type { DeliveryBoy } from '../../delivery/types';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

export default function Riders() {
  const { restaurantId, user, restaurant, globalSelectedDate } = useAuthContext();
  const currency = restaurant?.currency ?? '₹';

  const [riders, setRiders] = useState<DeliveryBoy[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Rider details state for settlement popup
  const [selectedRider, setSelectedRider] = useState<DeliveryBoy | null>(null);
  const [submittingPayout, setSubmittingPayout] = useState(false);

  // Subscriptions to database
  useEffect(() => {
    if (!restaurantId) return;

    setLoading(true);

    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60000));
    const todayStr = istTime.toISOString().split('T')[0];
    const targetDateStr = globalSelectedDate || todayStr;

    if (targetDateStr !== todayStr) {
      setLoading(true);
      let activeUnsub: (() => void) | null = null;
      const snapRef = doc(db, 'restaurants', restaurantId, 'dailySnapshots', targetDateStr);
      getDoc(snapRef).then((snapDoc) => {
        if (snapDoc.exists()) {
          const snapData = snapDoc.data();
          setRiders(snapData.riders || []);
          setOrders((snapData.orders || []).filter((o: any) => o.orderType === 'delivery'));
          setLoading(false);
        } else {
          activeUnsub = startActiveSubscriptions(targetDateStr);
        }
      }).catch(err => {
        console.error("Failed to load snapshot riders:", err);
        activeUnsub = startActiveSubscriptions(targetDateStr);
      });
      return () => {
        if (activeUnsub) activeUnsub();
      };
    }

    const unsub = startActiveSubscriptions(todayStr);
    return unsub;

    function startActiveSubscriptions(dateStr: string) {
      // 1. Listen to all platform riders
      const ridersQuery = query(collection(db, 'deliveryBoys'));
      const unsubRiders = onSnapshot(ridersQuery, (snap) => {
        const list = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as DeliveryBoy));
        setRiders(list);
        setLoading(false);
      }, (err) => {
        console.error("Riders read error:", err);
        setLoading(false);
      });

      // 2. Listen to all delivery orders of this restaurant
      const ordersQuery = query(
        collection(db, 'restaurants', restaurantId!, 'orders'),
        where('orderType', '==', 'delivery')
      );
      const unsubOrders = onSnapshot(ordersQuery, (snap) => {
        const list = snap.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as Order))
          .filter(o => o.orderDate === dateStr);
        setOrders(list);
      });

      return () => {
        unsubRiders();
        unsubOrders();
      };
    }
  }, [restaurantId, globalSelectedDate]);

  // Calculations for dashboard metrics
  const totalRidersCount = riders.length;
  
  // Active deliveries (assigned to a rider and not yet delivered/completed/cancelled)
  const activeOrdersCount = orders.filter(o => 
    o.status === 'ready' || o.status === 'out_for_delivery'
  ).length;

  const unsettledCashTotal = riders.reduce((sum, r) => sum + (r.unsettledCash || 0), 0);
  const unsettledUpiTotal = riders.reduce((sum, r) => sum + (r.unsettledUpi || 0), 0);
  const settledCashTotal = riders.reduce((sum, r) => sum + (r.totalCashCollected || 0), 0);
  const settledUpiTotal = riders.reduce((sum, r) => sum + (r.totalUpiCollected || 0), 0);

  // Helper to determine active rider status
  const getRiderStatus = (rider: DeliveryBoy): 'available' | 'delivering' | 'offline' => {
    if (!rider.isOnline) return 'offline';
    const hasActiveOrders = (rider.activeOrderIds && rider.activeOrderIds.length > 0) || !!(rider as any).currentOrderId;
    return hasActiveOrders ? 'delivering' : 'available';
  };

  // Helper to get active orders assigned to a rider
  const getRiderActiveOrders = (riderId: string) => {
    return orders.filter(o => 
      o.assignedRiderId === riderId && 
      (o.status === 'ready' || o.status === 'out_for_delivery')
    );
  };

  // Helper to get completed, unsettled orders for a rider
  const getRiderUnsettledOrders = (riderId: string) => {
    return orders.filter(o => 
      (o as any).rider?.id === riderId && 
      o.status === 'delivered' && 
      (o as any).rider?.settled === false
    );
  };

  // Helper to format last settlement relative time
  const formatLastSettlement = (timestamp: any) => {
    if (!timestamp) return 'Never';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' });
    }
  };

  // Process data for list
  const filteredRiders = riders.filter(rider => {
    const matchesSearch = rider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (rider.phone && rider.phone.includes(searchQuery));
    return matchesSearch;
  });

  // Handle recorded settlement
  async function handleRecordSettlement() {
    if (!selectedRider || !restaurantId || !user?.uid) return;

    const cashCol = selectedRider.unsettledCash || 0;
    const upiCol = selectedRider.unsettledUpi || 0;

    setSubmittingPayout(true);
    try {
      await recordRiderSettlement(
        selectedRider.uid,
        restaurantId,
        cashCol,
        upiCol,
        0, // legacy: deliveryEarnings
        cashCol + upiCol, // legacy: netReturned
        'Mixed', // legacy: method
        'Operational Settlement', // legacy: reference
        user.uid
      );
      
      toast.success(`Settlement recorded successfully!`);
      setSelectedRider(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to record settlement');
    } finally {
      setSubmittingPayout(false);
    }
  }

  // Generate and download CSV
  const handleExportCSV = () => {
    const headers = [
      'Rider Name',
      'Phone',
      'Status',
      'Completed Orders',
      'Unsettled Cash',
      'Unsettled UPI',
      'Lifetime Cash Collected',
      'Lifetime UPI Collected',
      'Last Settlement'
    ];

    const rows = filteredRiders.map(r => {
      const status = getRiderStatus(r);
      const lastSettled = r.lastSettledAt
        ? (typeof (r.lastSettledAt as any).toDate === 'function' 
            ? (r.lastSettledAt as any).toDate().toLocaleString() 
            : new Date((r.lastSettledAt as any).seconds * 1000).toLocaleString())
        : 'Never';
      return [
        r.name,
        r.phone || 'N/A',
        status,
        r.totalCompletedOrders || 0,
        r.unsettledCash || 0,
        r.unsettledUpi || 0,
        r.totalCashCollected || 0,
        r.totalUpiCollected || 0,
        lastSettled
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `riders_settlements_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Riders report CSV downloaded!');
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-left text-slate-900 dark:text-premium-text transition-colors duration-200"
    >
      <AdminHeader title="nav.riders" />

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Overview cards */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6">
          <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border p-5 rounded-2xl shadow-sm dark:shadow-premium">
            <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Total Riders</span>
            <p className="text-[34px] font-extrabold text-slate-950 dark:text-premium-text mt-1.5 leading-none">{totalRidersCount}</p>
          </div>
          <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border p-5 rounded-2xl shadow-sm dark:shadow-premium">
            <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Active Orders</span>
            <p className="text-[34px] font-extrabold text-slate-950 dark:text-premium-text mt-1.5 leading-none">{activeOrdersCount}</p>
          </div>
          <div className="bg-white dark:bg-premium-card border border-premium-warning/35 p-5 rounded-2xl shadow-sm dark:shadow-premium bg-premium-warning/[0.04]">
            <span className="text-[10px] text-premium-warning font-bold uppercase tracking-wider block">Unsettled Cash</span>
            <p className="text-[34px] font-extrabold text-premium-warning mt-1.5 leading-none">{formatCurrency(unsettledCashTotal, currency)}</p>
          </div>
          <div className="bg-white dark:bg-premium-card border border-premium-primary/35 p-5 rounded-2xl shadow-sm dark:shadow-premium bg-premium-primary/[0.04]">
            <span className="text-[10px] text-premium-primary font-bold uppercase tracking-wider block">Unsettled UPI</span>
            <p className="text-[34px] font-extrabold text-premium-primary mt-1.5 leading-none">{formatCurrency(unsettledUpiTotal, currency)}</p>
          </div>
          <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border p-5 rounded-2xl shadow-sm dark:shadow-premium">
            <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Cash Collected</span>
            <p className="text-[34px] font-extrabold text-slate-950 dark:text-premium-text mt-1.5 leading-none">{formatCurrency(settledCashTotal, currency)}</p>
          </div>
          <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border p-5 rounded-2xl shadow-sm dark:shadow-premium">
            <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">UPI Collected</span>
            <p className="text-[34px] font-extrabold text-slate-950 dark:text-premium-text mt-1.5 leading-none">{formatCurrency(settledUpiTotal, currency)}</p>
          </div>
        </div>

        {/* Filters and search */}
        <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl p-4 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm dark:shadow-premium">
          <div className="relative w-full md:w-80 select-none">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-premium-muted" />
            <input
              type="text"
              placeholder="Search rider name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-premium-text placeholder-slate-400 dark:placeholder-premium-muted focus:outline-none focus:border-premium-primary transition h-[40px] font-semibold"
            />
          </div>

          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="w-full md:w-auto font-bold gap-1.5 shrink-0"
          >
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>

        {/* Riders Cards Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-premium-primary" />
          </div>
        ) : filteredRiders.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl text-slate-400 dark:text-premium-muted space-y-3 shadow-sm">
            <Bike className="w-12 h-12 text-slate-200 dark:text-premium-border mx-auto" />
            <p className="text-sm font-semibold">No active riders found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRiders.map((rider) => {
              const status = getRiderStatus(rider);
              const activeOrders = getRiderActiveOrders(rider.uid);

              return (
                <div key={rider.uid} className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 space-y-4 hover:border-premium-primary hover:-translate-y-0.5 shadow-sm dark:shadow-premium transition duration-200 flex flex-col justify-between">
                  {/* Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-premium-bg border border-slate-200 dark:border-premium-border flex items-center justify-center text-sm font-extrabold text-premium-primary shrink-0 select-none">
                        {rider.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-slate-900 dark:text-premium-text font-bold text-sm truncate">{rider.name}</h3>
                        <p className="text-[10px] text-slate-500 dark:text-premium-muted font-bold mt-0.5 truncate">{rider.phone || 'No Phone'}</p>
                      </div>
                    </div>
                    
                    {/* Status Badge */}
                    <div className="shrink-0 select-none">
                      {status === 'available' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/20">
                          Available
                        </span>
                      )}
                      {status === 'delivering' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/20 animate-pulse">
                          Delivering
                        </span>
                      )}
                      {status === 'offline' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-premium-muted/15 text-slate-550 dark:text-premium-muted border border-slate-200 dark:border-premium-border">
                          Offline
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Call & WhatsApp Quick Buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {rider.phone ? (
                      <>
                        <a
                          href={`tel:${rider.phone}`}
                          className="bg-slate-50 hover:bg-slate-100 dark:bg-premium-bg dark:hover:bg-premium-hover border border-slate-200 dark:border-premium-border text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 shadow-sm"
                        >
                          <Phone className="w-3.5 h-3.5" /> Call
                        </a>
                        <a
                          href={`https://wa.me/${rider.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-slate-50 hover:bg-slate-100 dark:bg-premium-bg dark:hover:bg-premium-hover border border-slate-200 dark:border-premium-border text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition duration-150 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                        </a>
                      </>
                    ) : (
                      <div className="col-span-2 text-center text-[10px] text-slate-400 dark:text-premium-muted py-2 bg-slate-50 dark:bg-premium-bg rounded-xl border border-slate-200 dark:border-premium-border">
                        No contact options available
                      </div>
                    )}
                  </div>

                  {/* Assigned Orders */}
                  <div className="border-t border-slate-200 dark:border-premium-border/40 pt-4 space-y-4">
                    <div className="space-y-2">
                      <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Assigned Orders</span>
                      {activeOrders.length === 0 ? (
                        <span className="text-xs text-slate-500 dark:text-premium-muted block italic font-semibold">No assigned orders</span>
                      ) : (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                          {activeOrders.map(order => (
                            <div key={order.id} className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border/40 rounded-xl p-3 text-xs text-slate-900 dark:text-premium-text space-y-1.5 shadow-sm">
                              <div className="flex justify-between font-bold">
                                <span>#{order.dailyOrderId || order.id.slice(0, 6)}</span>
                                <span className="text-premium-success">{formatCurrency(order.totalAmount, currency)}</span>
                              </div>
                              <div className="flex justify-between text-[10px] text-slate-500 dark:text-premium-muted font-bold">
                                <span>{order.address?.name || 'Customer'}</span>
                                <span className="truncate max-w-[120px]">📍 {order.address?.landmark || order.address?.town || 'No landmark'}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Completed Orders Count */}
                    <div className="flex justify-between items-center text-xs border-t border-slate-200 dark:border-premium-border/30 pt-3 font-semibold">
                      <span className="text-slate-500 dark:text-premium-muted font-bold uppercase text-[10px] tracking-wider">Completed</span>
                      <span className="text-slate-900 dark:text-premium-text font-bold">{rider.totalCompletedOrders || 0} Orders</span>
                    </div>
                  </div>

                  {/* Unsettled Cash and UPI balances */}
                  <div className="border-t border-slate-200 dark:border-premium-border/40 pt-4 space-y-2.5 text-xs font-semibold">
                    <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Unsettled Balances</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-premium-muted">Cash Pending</span>
                      <span className="text-premium-warning font-bold">{formatCurrency(rider.unsettledCash || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-premium-muted">UPI Pending</span>
                      <span className="text-premium-primary font-bold">{formatCurrency(rider.unsettledUpi || 0, currency)}</span>
                    </div>
                  </div>

                  {/* Lifetime Cash and UPI totals */}
                  <div className="border-t border-slate-200 dark:border-premium-border/40 pt-4 space-y-2.5 text-xs font-semibold">
                    <span className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block">Lifetime Collected</span>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-premium-muted">Cash Settled</span>
                      <span className="text-slate-900 dark:text-premium-text font-bold">{formatCurrency(rider.totalCashCollected || 0, currency)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-premium-muted">UPI Settled</span>
                      <span className="text-slate-900 dark:text-premium-text font-bold">{formatCurrency(rider.totalUpiCollected || 0, currency)}</span>
                    </div>
                  </div>

                  {/* Last Settlement */}
                  <div className="border-t border-slate-200 dark:border-premium-border/40 pt-4 flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-500 dark:text-premium-muted font-bold uppercase text-[10px] tracking-wider">Last Settlement</span>
                    <span className="text-slate-900 dark:text-premium-text font-bold">{formatLastSettlement(rider.lastSettledAt)}</span>
                  </div>

                  {/* Settle Rider Button */}
                  <div className="pt-4 border-t border-slate-200 dark:border-premium-border/40">
                    <button
                      onClick={() => setSelectedRider(rider)}
                      disabled={!(rider.unsettledCash || rider.unsettledUpi)}
                      className="w-full bg-premium-primary hover:bg-blue-600 disabled:bg-slate-50 disabled:text-slate-400 dark:disabled:bg-premium-bg dark:disabled:text-premium-muted/50 text-white font-bold text-xs h-[42px] rounded-xl shadow-premium transition duration-150 flex items-center justify-center gap-1.5"
                    >
                      <CreditCard className="w-4 h-4" /> Settle Rider
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Collect Rider Payments (Settle Modal) */}
      <Modal
        open={!!selectedRider}
        onClose={() => setSelectedRider(null)}
        title="Collect Rider Payments"
        className="max-w-md"
      >
        {selectedRider && (
          <div className="space-y-6 text-left">
            <div>
              <label className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider block mb-1">Rider</label>
              <div className="text-slate-900 dark:text-premium-text font-extrabold text-lg leading-none">{selectedRider.name}</div>
            </div>

            {/* Cash breakdown list */}
            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-slate-200 dark:border-premium-border pb-2">
                <span className="text-premium-warning font-bold text-xs uppercase tracking-wider">Cash Orders</span>
                <span className="text-premium-warning font-bold text-xs">{formatCurrency(selectedRider.unsettledCash || 0, currency)}</span>
              </div>
              {getRiderUnsettledOrders(selectedRider.uid).filter(o => (o as any).paymentMethod === 'cash').length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-premium-muted italic pl-1 font-semibold">No cash orders pending settlement</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {getRiderUnsettledOrders(selectedRider.uid)
                    .filter(o => (o as any).paymentMethod === 'cash')
                    .map(o => (
                      <div key={o.id} className="flex justify-between text-xs text-slate-500 dark:text-premium-muted bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border/40 p-2.5 rounded-lg shadow-sm">
                        <span className="font-bold text-slate-900 dark:text-premium-text">#{o.dailyOrderId || o.id.slice(0, 6)}</span>
                        <span className="font-bold font-mono">{formatCurrency(o.totalAmount, currency)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* UPI breakdown list */}
            <div className="space-y-2.5">
              <div className="flex justify-between border-b border-slate-200 dark:border-premium-border pb-2">
                <span className="text-premium-primary font-bold text-xs uppercase tracking-wider">UPI Orders</span>
                <span className="text-premium-primary font-bold text-xs">{formatCurrency(selectedRider.unsettledUpi || 0, currency)}</span>
              </div>
              {getRiderUnsettledOrders(selectedRider.uid).filter(o => (o as any).paymentMethod === 'upi').length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-premium-muted italic pl-1 font-semibold">No UPI orders pending settlement</p>
              ) : (
                <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                  {getRiderUnsettledOrders(selectedRider.uid)
                    .filter(o => (o as any).paymentMethod === 'upi')
                    .map(o => (
                      <div key={o.id} className="flex justify-between text-xs text-slate-500 dark:text-premium-muted bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border/40 p-2.5 rounded-lg shadow-sm">
                        <span className="font-bold text-slate-900 dark:text-premium-text">#{o.dailyOrderId || o.id.slice(0, 6)}</span>
                        <span className="font-bold font-mono">{formatCurrency(o.totalAmount, currency)}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Net Total Summary */}
            <div className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-4 flex justify-between items-center text-sm font-bold text-slate-900 dark:text-premium-text select-none">
              <span>Total Collections</span>
              <span className="text-premium-success text-base font-extrabold">{formatCurrency((selectedRider.unsettledCash || 0) + (selectedRider.unsettledUpi || 0), currency)}</span>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-slate-200 dark:border-premium-border flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedRider(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRecordSettlement}
                disabled={submittingPayout}
                className="flex-1 shadow-premium font-bold gap-1.5"
              >
                {submittingPayout ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>Collect &amp; Settle</>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </motion.div>
  );
}
