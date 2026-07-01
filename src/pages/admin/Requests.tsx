import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { useOrders } from '../../hooks/useOrders';
import { completeWaterRequest, verifyOrderPayment, rejectOrderPayment } from '../../firebase/db';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { useNow } from '../../hooks/useNow';
import { GlassWater, Check, Clock, BellRing, ArrowUpDown, ClipboardList, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Timestamp } from 'firebase/firestore';

export default function Requests() {
  const { restaurantId } = useAuthContext();
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('oldest');
  const { requests, loading } = useWaterRequests(restaurantId, filter);
  const { orders } = useOrders(restaurantId);
  const now = useNow();
  
  const today = new Date().setHours(0, 0, 0, 0);
  const pendingOrdersCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return o.status === 'pending' && ts >= today;
  }).length;

  const sortedRequests = [...requests].sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
    return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  async function handleComplete(requestId: string, type?: 'water' | 'waiter' | 'payment', orderId?: string) {
    if (!restaurantId) return;
    try {
      if (type === 'payment' && orderId) {
        await verifyOrderPayment(restaurantId, orderId, undefined, requestId);
        toast.success('Payment verified!');
      } else {
        await completeWaterRequest(restaurantId, requestId);
        if (type === 'waiter') toast.success('Waiter call marked as resolved!');
        else toast.success('Water request marked as served!');
      }
    } catch {
      toast.error('Failed to complete request');
    }
  }

  async function handleReject(requestId: string, orderId?: string) {
    if (!restaurantId || !orderId) return;
    try {
      await rejectOrderPayment(restaurantId, orderId, undefined, requestId);
      toast.success('Payment rejected. Customer can retry.');
    } catch {
      toast.error('Failed to reject payment');
    }
  }

  function getReqTime(timestamp?: Timestamp | Date | string | number) {
    if (!timestamp) return '0s';
    let ms: number;
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      ms = timestamp.toDate().getTime();
    } else if (timestamp instanceof Date) {
      ms = timestamp.getTime();
    } else {
      ms = new Date(timestamp as string | number).getTime();
    }
    // Pass ms value — formatTimeAgo handles number type
    return formatTimeAgo(ms);
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void now; // consumed by formatTimeAgo via Date.now() on each render

  return (
    <div className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-slate-900 dark:text-premium-text transition-colors duration-200">
      <AdminHeader title="Requests">
        <Link
          to="/admin/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 dark:bg-premium-bg text-slate-650 dark:text-premium-text hover:text-premium-primary border border-slate-200 dark:border-premium-border transition-all duration-150"
        >
          <ClipboardList className="w-3.5 h-3.5 text-premium-primary" />
          <span>Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="w-4 h-4 bg-premium-primary text-black text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
              {pendingOrdersCount}
            </span>
          )}
        </Link>
      </AdminHeader>
      
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Toggle Filters */}
        <div className="flex gap-2 border-b border-slate-200 dark:border-premium-border/40 pb-4 items-center justify-between flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30'
                  : 'text-slate-500 dark:text-premium-muted hover:bg-slate-100 dark:hover:bg-premium-hover'
              }`}
            >
              Active Requests{filter === 'pending' ? ` (${requests.length})` : ''}
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-250 dark:border-emerald-900/30'
                  : 'text-slate-500 dark:text-premium-muted hover:bg-slate-100 dark:hover:bg-premium-hover'
              }`}
            >
              Completed{filter === 'completed' ? ` (${requests.length})` : ''}
            </button>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-50 dark:bg-premium-bg text-slate-650 dark:text-premium-text hover:text-premium-primary border border-slate-200 dark:border-premium-border transition-all duration-150"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'latest' ? 'Latest First' : 'Oldest First'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-premium-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl shadow-sm dark:shadow-premium">
            <GlassWater className="w-12 h-12 text-slate-400 dark:text-premium-muted mx-auto mb-3" />
            <p className="text-slate-500 dark:text-premium-muted text-sm">No {filter} requests found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRequests.map(req => (
              <div 
                key={req.id} 
                className={`bg-white dark:bg-premium-card border rounded-2xl p-5 flex flex-col justify-between hover:border-premium-primary/40 transition-all duration-300 shadow-md relative overflow-hidden group ${
                  req.type === 'payment'
                    ? 'border-emerald-250 dark:border-emerald-950/20 bg-emerald-50/5 dark:bg-emerald-950/5'
                    : 'border-slate-200 dark:border-premium-border'
                }`}
              >
                {filter === 'pending' && req.type !== 'payment' && (
                  <div className="absolute top-0 right-0 bg-red-500/10 border-b border-l border-red-500/20 px-3 py-1 text-[10px] font-semibold text-red-400 rounded-bl-xl uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <BellRing className="w-3 h-3" /> Urgent
                  </div>
                )}
                {filter === 'pending' && req.type === 'payment' && (
                  <div className="absolute top-0 right-0 bg-[#22c55e]/10 border-b border-l border-[#22c55e]/20 px-3 py-1 text-[10px] font-semibold text-[#22c55e] rounded-bl-xl uppercase tracking-wider flex items-center gap-1">
                    <CreditCard className="w-3 h-3" /> Payment
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                      req.type === 'payment'
                        ? 'bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e]'
                        : 'bg-slate-100 dark:bg-premium-bg border border-slate-200 dark:border-premium-border text-slate-600 dark:text-premium-muted'
                    }`}>
                      <span className="text-lg font-bold">
                        {req.type === 'payment' ? '💳' : req.type === 'waiter' ? '🛎️' : (req.tableNumber === 'Takeaway' ? '🥡' : `T${req.tableNumber}`)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-950 dark:text-premium-text text-base">
                        {req.tableNumber === 'Takeaway' ? 'Takeaway' : `Table ${req.tableNumber}`}
                      </h4>
                      <p className="text-slate-450 dark:text-premium-muted text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {getReqTime(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-3.5 flex items-center justify-between">
                    {req.type === 'payment' ? (
                      <>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500 dark:text-premium-muted text-xs flex items-center gap-1.5">
                            Payment {req.dailyOrderId && <span className="text-slate-900 dark:text-premium-text font-semibold">Order #{req.dailyOrderId}</span>}
                          </span>
                          {req.customerName && (
                            <span className="text-slate-450 dark:text-premium-muted text-[11px]">{req.customerName}</span>
                          )}
                        </div>
                        <span className="text-[#22c55e] text-base font-bold flex items-center gap-1.5">
                          💳 {req.amount !== undefined ? formatCurrency(req.amount, '₹') : '—'}
                        </span>
                      </>
                    ) : req.type === 'waiter' ? (
                      <>
                        <span className="text-slate-550 dark:text-premium-muted text-xs">Service Call</span>
                        <span className="text-slate-950 dark:text-premium-text text-base font-bold flex items-center gap-1.5 animate-pulse">
                          🛎️ Call Waiter
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-550 dark:text-premium-muted text-xs">Mineral Water {req.ml ? `(${req.ml}ml)` : ''}</span>
                        <span className="text-slate-950 dark:text-premium-text text-base font-bold flex items-center gap-1.5">
                          💧 {req.qty} {req.qty > 1 ? 'Bottles' : 'Bottle'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {filter === 'pending' && (
                  <div className="mt-5">
                    {req.type === 'payment' ? (
                      <div className="flex gap-2">
                        <Button
                          fullWidth
                          onClick={() => handleComplete(req.id, req.type, req.orderId)}
                          className="!bg-[#22c55e] hover:!bg-[#16a34a] flex items-center justify-center gap-2 text-white font-bold"
                        >
                          <Check className="w-4 h-4" /> Verify
                        </Button>
                        <Button
                          fullWidth
                          variant="ghost"
                          onClick={() => handleReject(req.id, req.orderId)}
                          className="text-[#ef4444] hover:bg-red-500/10 border border-red-500/20 flex items-center justify-center gap-2"
                        >
                          Reject
                        </Button>
                      </div>
                    ) : (
                      <Button
                        fullWidth
                        onClick={() => handleComplete(req.id, req.type, req.orderId)}
                      >
                        <Check className="w-4 h-4" />
                        {req.type === 'waiter' ? 'Mark as Resolved' : 'Mark as Served'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
