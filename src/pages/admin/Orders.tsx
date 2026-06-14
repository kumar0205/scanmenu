import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowUpDown, Bell } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useOrders } from '../../hooks/useOrders';
import { updateOrderStatus } from '../../firebase/db';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatTimeAgo, formatCurrency } from '../../utils/formatters';
import toast from 'react-hot-toast';
import type { Order } from '../../types';

const STATUS_TABS = ['all', 'pending', 'accepted', 'completed', 'cancelled', 'extra'] as const;
type StatusTab = typeof STATUS_TABS[number];

export default function Orders() {
  const { restaurantId, restaurant, isDemo } = useAuthContext();
  const { t } = useI18n();
  const { orders, loading } = useOrders(restaurantId);
  const { requests } = useWaterRequests(restaurantId);
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('today');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('oldest');
  const currency = restaurant?.currency ?? '₹';

  const now = Date.now();
  const dateThreshold = dateFilter === 'today'
    ? new Date().setHours(0, 0, 0, 0)
    : dateFilter === '7days'
    ? now - 7 * 24 * 3600 * 1000
    : now - 30 * 24 * 3600 * 1000;

  const filtered = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    if (ts < dateThreshold) return false;
    if (activeTab !== 'all') {
      if (activeTab === 'accepted') {
        if (o.status !== 'preparing' && o.status !== 'ready') return false;
      } else if (activeTab === 'extra') {
        if (!o.items.some(i => i.isExtra)) return false;
      } else {
        if (o.status !== activeTab) return false;
      }
    }
    return true;
  });

  const pendingCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return o.status === 'pending' && ts >= dateThreshold;
  }).length;

  const acceptedCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return (o.status === 'preparing' || o.status === 'ready') && ts >= dateThreshold;
  }).length;

  const extraCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return o.items.some(i => i.isExtra) && ts >= dateThreshold;
  }).length;

  const sortedFiltered = [...filtered].sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
    return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  async function advance(order: Order) {
    const next: Record<string, Order['status']> = { pending: 'preparing', preparing: 'ready', ready: 'completed' };
    const s = next[order.status];
    if (!s) return;
    try {
      if (!isDemo && restaurantId) {
        await updateOrderStatus(restaurantId, order.id, s);
      }
      toast.success(t('orders.updateStatus'));
    } catch {
      toast.error('Failed to update order status');
    }
  }

  async function cancel(order: Order) {
    try {
      if (!isDemo && restaurantId) {
        await updateOrderStatus(restaurantId, order.id, 'cancelled');
      }
      toast.success(t('orders.updateStatus'));
    } catch {
      toast.error('Failed to cancel order');
    }
  }

  async function markPaid(order: Order) {
    if (!order.sessionId) {
      toast.error('Payment session not found for this order');
      return;
    }
    try {
      if (!isDemo && restaurantId) {
        const batch = writeBatch(db);
        batch.update(doc(db, 'restaurants', restaurantId, 'orders', order.id), { paymentStatus: 'paid' });
        batch.update(doc(db, 'sessions', order.sessionId), { status: 'paid' });
        await batch.commit();
      }
      toast.success('Payment marked as paid');
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark payment as paid');
    }
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.orders')}>
        <Link
          to="/admin/requests"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] text-[#a1a1aa] hover:text-white border border-[#2a2a2a] transition-all duration-150"
        >
          <Bell className="w-3.5 h-3.5 text-[#ef4444]" />
          <span>Requests</span>
          {pendingRequestsCount > 0 && (
            <span className="w-4 h-4 bg-[#ef4444] text-white text-[9px] rounded-full flex items-center justify-center font-bold">
              {pendingRequestsCount}
            </span>
          )}
        </Link>
      </AdminHeader>
      <div className="p-6 space-y-5">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 relative ${
                  activeTab === tab
                    ? tab === 'extra'
                      ? 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b]'
                      : 'bg-[rgba(34,197,94,0.15)] text-[#22c55e]'
                    : 'bg-[#1a1a1a] text-[#a1a1aa] hover:text-white'
                }`}
              >
                {tab === 'all' ? 'All' : tab === 'extra' ? 'Extra' : t(`orders.status.${tab}`)}
                {tab === 'pending' && pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#ef4444] text-white text-[9px] rounded-full flex items-center justify-center">{pendingCount}</span>
                )}
                {tab === 'accepted' && acceptedCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#eab308] text-black text-[9px] rounded-full flex items-center justify-center font-bold">{acceptedCount}</span>
                )}
                {tab === 'extra' && extraCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#f59e0b] text-black text-[9px] rounded-full flex items-center justify-center font-bold animate-pulse">{extraCount}</span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | '7days' | 'month')}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#a1a1aa] hover:text-white text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22c55e] cursor-pointer transition-colors"
            >
              <option value="today" className="bg-[#111111] text-white">Today</option>
              <option value="7days" className="bg-[#111111] text-white">7 Days</option>
              <option value="month" className="bg-[#111111] text-white">Month</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-[#a1a1aa] hover:text-white border border-[#2a2a2a] transition-all duration-150"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'latest' ? 'Latest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList className="w-16 h-16 text-[#2a2a2a] mx-auto mb-4" />
            <p className="text-white font-medium">{t('orders.noOrders')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedFiltered.map(order => (
              <OrderCard key={order.id} order={order} currency={currency} onAdvance={advance} onCancel={cancel} onMarkPaid={markPaid} t={t} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, currency, onAdvance, onCancel, onMarkPaid, t }: {
  order: Order;
  currency: string;
  onAdvance: (o: Order) => void;
  onCancel: (o: Order) => void;
  onMarkPaid: (o: Order) => void;
  t: (key: string) => string;
}) {
  const { language } = useI18n();
  const acceptLabel = language === 'te' ? 'ఆమోదించు' : language === 'hi' ? 'स्वीकार करें' : 'Accept';

  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-white font-semibold">{t('generic.table')} {order.tableNumber}</p>
            {order.paymentStatus && (
              <Badge 
                variant={order.paymentStatus === 'paid' ? 'green' : order.paymentStatus === 'verifying' ? 'amber' : 'gray'} 
                className={`text-[10px] py-0 px-1.5 leading-tight uppercase font-bold tracking-wider ${order.paymentStatus === 'verifying' ? 'animate-pulse' : ''}`}
              >
                {order.paymentStatus === 'paid' ? 'Paid' : order.paymentStatus === 'verifying' ? 'Verifying' : 'Unpaid'}
              </Badge>
            )}
            {order.items.some(i => i.isExtra) && (
              <Badge variant="amber" className="text-[10px] py-0 px-1.5 leading-tight uppercase font-bold tracking-wider animate-pulse">
                Extra Added
              </Badge>
            )}
          </div>
          <p className="text-[#a1a1aa] text-xs mt-0.5">{order.customerName}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Badge variant={statusBadge(order.status)}>{t(`orders.status.${order.status}`)}</Badge>
          <span className="text-[#52525b] text-[11px]">{formatTimeAgo(order.createdAt)}</span>
        </div>
      </div>

      <div className="space-y-1">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className={`w-2 h-2 rounded-sm shrink-0 ${item.isVeg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
            <span className="text-[#a1a1aa] flex-1">
              {item.qty}x {item.name}
              {item.isExtra && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)] uppercase tracking-wide">
                  Extra
                </span>
              )}
            </span>
            <span className="text-[#52525b]">{currency}{item.price * item.qty}</span>
          </div>
        ))}
      </div>

      {order.note && (
        <p className="text-[#52525b] text-xs italic border-t border-[#1a1a1a] pt-2">Note: {order.note}</p>
      )}

      <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-2">
        <span className="text-[#a1a1aa] text-xs">{t('orders.total')}</span>
        <span className="text-white font-semibold">{formatCurrency(order.totalAmount, currency)}</span>
      </div>

      {(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') && (
        <div className="flex flex-wrap gap-2">
          {(order.paymentStatus === 'unpaid' || order.paymentStatus === 'verifying') && order.sessionId && (
            <Button 
              size="sm" 
              variant={order.paymentStatus === 'verifying' ? 'primary' : 'outline'} 
              className={`flex-1 min-w-[120px] ${
                order.paymentStatus === 'verifying' 
                  ? 'bg-amber-500 hover:bg-amber-600 text-black border-none animate-pulse font-bold' 
                  : ''
              }`} 
              onClick={() => onMarkPaid(order)}
            >
              {order.paymentStatus === 'verifying' ? 'Confirm Payment' : 'Mark Paid'}
            </Button>
          )}
          {order.status === 'pending' && (
            <>
              <Button size="sm" className="flex-1" onClick={() => onAdvance(order)}>
                {acceptLabel}
              </Button>
              <Button size="sm" variant="ghost" className="text-[#ef4444] hover:bg-red-500/10" onClick={() => onCancel(order)}>
                {t('generic.cancel')}
              </Button>
            </>
          )}
          {order.status === 'preparing' && (
            <>
              <Button size="sm" variant="outline" className="flex-1 border-amber-500 text-amber-400 hover:bg-amber-500/10" onClick={() => onAdvance(order)}>
                {t('orders.status.ready')}
              </Button>
              <Button size="sm" variant="ghost" className="text-[#ef4444] hover:bg-red-500/10" onClick={() => onCancel(order)}>
                {t('orders.status.cancelled')}
              </Button>
            </>
          )}
          {order.status === 'ready' && (
            <Button size="sm" fullWidth onClick={() => onAdvance(order)}>
              {t('orders.status.completed')}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
