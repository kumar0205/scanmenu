import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { useOrders } from '../../hooks/useOrders';
import { completeWaterRequest } from '../../firebase/db';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { GlassWater, Check, Clock, BellRing, ArrowUpDown, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Timestamp } from 'firebase/firestore';

export default function Requests() {
  const { restaurantId } = useAuthContext();
  const [filter, setFilter] = useState<'pending' | 'completed'>('pending');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('oldest');
  const { requests, loading } = useWaterRequests(restaurantId, filter);
  const { orders } = useOrders(restaurantId);
  
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

  async function handleComplete(requestId: string, type?: 'water' | 'waiter') {
    if (!restaurantId) return;
    try {
      await completeWaterRequest(restaurantId, requestId);
      toast.success(type === 'waiter' ? 'Waiter call marked as resolved!' : 'Water request marked as served!');
    } catch {
      toast.error('Failed to complete request');
    }
  }

  function formatTime(timestamp?: Timestamp | Date | string | number) {
    if (!timestamp) return 'Just now';
    let date: Date;
    if (typeof timestamp === 'object' && 'toDate' in timestamp && typeof timestamp.toDate === 'function') {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      date = new Date(timestamp as string | number);
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-white">
      <AdminHeader title="Requests">
        <Link
          to="/admin/orders"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] text-[#a1a1aa] hover:text-white border border-[#2a2a2a] transition-all duration-150"
        >
          <ClipboardList className="w-3.5 h-3.5 text-[#22c55e]" />
          <span>Orders</span>
          {pendingOrdersCount > 0 && (
            <span className="w-4 h-4 bg-[#22c55e] text-black text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">
              {pendingOrdersCount}
            </span>
          )}
        </Link>
      </AdminHeader>
      
      <div className="p-6 space-y-6 max-w-5xl mx-auto">
        {/* Toggle Filters */}
        <div className="flex gap-2 border-b border-[#2a2a2a] pb-4 items-center justify-between flex-wrap">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('pending')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'pending'
                  ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#a1a1aa] hover:bg-[#111111]'
              }`}
            >
              Active Requests{filter === 'pending' ? ` (${requests.length})` : ''}
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[#22c55e]'
                  : 'text-[#a1a1aa] hover:bg-[#111111]'
              }`}
            >
              Completed{filter === 'completed' ? ` (${requests.length})` : ''}
            </button>
          </div>

          <button
            onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-[#a1a1aa] hover:text-white border border-[#2a2a2a] transition-all duration-150"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            {sortOrder === 'latest' ? 'Latest First' : 'Oldest First'}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#22c55e]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-[#111111] border border-[#2a2a2a] rounded-2xl">
            <GlassWater className="w-12 h-12 text-[#52525b] mx-auto mb-3" />
            <p className="text-[#a1a1aa] text-sm">No {filter} requests found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRequests.map(req => (
              <div 
                key={req.id} 
                className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/20 transition-all duration-300 shadow-md relative overflow-hidden group"
              >
                {filter === 'pending' && (
                  <div className="absolute top-0 right-0 bg-red-500/10 border-b border-l border-red-500/20 px-3 py-1 text-[10px] font-semibold text-red-400 rounded-bl-xl uppercase tracking-wider animate-pulse flex items-center gap-1">
                    <BellRing className="w-3 h-3" /> Urgent
                  </div>
                )}
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-brand-900/10 border border-brand-500/10 flex items-center justify-center text-brand-400 shrink-0">
                      <span className="text-lg font-bold">
                        {req.type === 'waiter' ? '🛎️' : (req.tableNumber === 'Takeaway' ? '🥡' : `T${req.tableNumber}`)}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base">
                        {req.tableNumber === 'Takeaway' ? 'Takeaway' : `Table ${req.tableNumber}`}
                      </h4>
                      <p className="text-[#52525b] text-xs flex items-center gap-1 mt-0.5">
                        <Clock className="w-3.5 h-3.5" /> {formatTime(req.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-3.5 flex items-center justify-between">
                    {req.type === 'waiter' ? (
                      <>
                        <span className="text-[#a1a1aa] text-xs">Service Call</span>
                        <span className="text-white text-base font-bold flex items-center gap-1.5 animate-pulse">
                          🛎️ Call Waiter
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-[#a1a1aa] text-xs">Mineral Water {req.ml ? `(${req.ml}ml)` : ''}</span>
                        <span className="text-white text-base font-bold flex items-center gap-1.5">
                          💧 {req.qty} {req.qty > 1 ? 'Bottles' : 'Bottle'}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {filter === 'pending' && (
                  <div className="mt-5">
                    <Button 
                      fullWidth 
                      onClick={() => handleComplete(req.id, req.type)}
                      className="flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> {req.type === 'waiter' ? 'Mark as Resolved' : 'Mark as Served'}
                    </Button>
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
