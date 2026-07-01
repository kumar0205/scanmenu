import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowUpDown, Bell, Bike, Search, Loader2, Send } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useOrders } from '../../hooks/useOrders';
import { updateOrderStatus, verifyOrderPayment } from '../../firebase/db';
import { formatTimeAgo, formatCurrency } from '../../utils/formatters';
import { useNow } from '../../hooks/useNow';
import { PlaceOrderModal } from '../../components/admin/PlaceOrderModal';
import { Modal } from '../../components/ui/Modal';
import toast from 'react-hot-toast';
import type { Order } from '../../types';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { acceptDeliveryOrder } from '../../delivery/firebase/riderDb';
import type { DeliveryBoy } from '../../delivery/types';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

const NORMAL_TABS = ['all', 'pending', 'accepted', 'completed', 'parcel', 'extra'] as const;
const DELIVERY_TABS = ['all', 'pending', 'accepted', 'out_for_delivery', 'delivered', 'cancelled'] as const;
type StatusTab = typeof NORMAL_TABS[number] | typeof DELIVERY_TABS[number];

export default function Orders() {
  const { restaurantId, restaurant, isDemo, globalSelectedDate } = useAuthContext();
  const { t } = useI18n();
  const { orders, loading } = useOrders(restaurantId, globalSelectedDate);
  const { requests } = useWaterRequests(restaurantId);
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;
  const [activeTab, setActiveTab] = useState<StatusTab>('all');
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month'>('today');
  const [typeFilter, setTypeFilter] = useState<'all' | 'dinein' | 'delivery'>('all');
  const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('oldest');
  const [isPlaceOrderOpen, setIsPlaceOrderOpen] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState<Order | null>(null);
  const [paymentSelectOrderId, setPaymentSelectOrderId] = useState<string | null>(null);
  const currency = restaurant?.currency ?? '₹';
  useNow(1000); // tick every second to keep formatTimeAgo live

  // Manual Rider Assignment states
  const [assigningRiderOrder, setAssigningRiderOrder] = useState<Order | null>(null);
  const [availableRiders, setAvailableRiders] = useState<DeliveryBoy[]>([]);
  const [loadingRiders, setLoadingRiders] = useState(false);
  const [riderSearch, setRiderSearch] = useState('');

  // Fetch online available riders when modal opens
  useEffect(() => {
    if (!assigningRiderOrder || !restaurantId) return;
    setLoadingRiders(true);
    
    const ridersQuery = query(collection(db, 'deliveryBoys'), where('isOnline', '==', true));
    getDocs(ridersQuery)
      .then(snap => {
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() } as DeliveryBoy));
        setAvailableRiders(list);
      })
      .catch(err => {
        console.error('Error fetching online riders:', err);
        toast.error('Failed to fetch available riders');
      })
      .finally(() => {
        setLoadingRiders(false);
      });
  }, [assigningRiderOrder, restaurantId]);

  async function handleAssignRider(riderId: string) {
    if (!assigningRiderOrder || !restaurantId) return;
    try {
      await acceptDeliveryOrder(restaurantId, assigningRiderOrder.id, riderId);
      toast.success('Rider assigned successfully! Order is out for delivery.');
      setAssigningRiderOrder(null);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Failed to assign rider');
    }
  }

  async function handleBroadcastOrder() {
    if (!assigningRiderOrder || !restaurantId) return;
    try {
      await updateDoc(doc(db, 'restaurants', restaurantId, 'orders', assigningRiderOrder.id), {
        broadcastRiderClaim: true,
        updatedAt: Timestamp.now()
      });
      toast.success('Order broadcasted! Any available rider can now claim this order.');
      setAssigningRiderOrder(null);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to broadcast order');
    }
  }

  const now = Date.now();
  const dateThreshold = dateFilter === 'today'
    ? new Date().setHours(0, 0, 0, 0)
    : dateFilter === '7days'
    ? now - 7 * 24 * 3600 * 1000
    : now - 30 * 24 * 3600 * 1000;

  const filtered = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    if (ts < dateThreshold) return false;
    if (typeFilter !== 'all') {
      const isDeliveryOrder = o.orderType === 'delivery';
      if (typeFilter === 'delivery' && !isDeliveryOrder) return false;
      if (typeFilter === 'dinein' && isDeliveryOrder) return false;
    }
    if (activeTab !== 'all') {
      if (typeFilter === 'delivery') {
        if (activeTab === 'pending') {
          if (o.status !== 'pending') return false;
        } else if (activeTab === 'accepted') {
          if (o.status !== 'accepted' && o.status !== 'preparing' && o.status !== 'ready') return false;
        } else if (activeTab === 'out_for_delivery') {
          if (o.status !== 'out_for_delivery') return false;
        } else if (activeTab === 'delivered') {
          if (o.status !== 'delivered' && o.status !== 'completed') return false;
        } else if (activeTab === 'cancelled') {
          if (o.status !== 'cancelled') return false;
        }
      } else {
        if (activeTab === 'pending') {
          if (o.status !== 'pending') return false;
        } else if (activeTab === 'accepted') {
          if (o.status !== 'accepted' && o.status !== 'preparing' && o.status !== 'ready' && o.status !== 'out_for_delivery') return false;
        } else if (activeTab === 'extra') {
          if (o.status === 'completed' || o.status === 'served' || o.status === 'delivered' || o.status === 'cancelled') return false;
          if (!o.items.some(i => i.isExtra)) return false;
        } else if (activeTab === 'parcel') {
          if (!o.isParcel) return false;
        } else if (activeTab === 'completed') {
          if (o.status !== 'completed' && o.status !== 'served' && o.status !== 'delivered') return false;
        } else {
          if (o.status !== activeTab) return false;
        }
      }
    }
    return true;
  });

  const pendingCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    const isDeliveryOrder = o.orderType === 'delivery';
    if (typeFilter === 'delivery' && !isDeliveryOrder) return false;
    if (typeFilter === 'dinein' && isDeliveryOrder) return false;
    return o.status === 'pending' && ts >= dateThreshold;
  }).length;

  const acceptedCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    const isDeliveryOrder = o.orderType === 'delivery';
    if (typeFilter === 'delivery' && !isDeliveryOrder) return false;
    if (typeFilter === 'dinein' && isDeliveryOrder) return false;
    if (typeFilter === 'delivery') {
      return (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready') && ts >= dateThreshold;
    }
    return (o.status === 'accepted' || o.status === 'preparing' || o.status === 'ready' || o.status === 'out_for_delivery') && ts >= dateThreshold;
  }).length;

  const outForDeliveryCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    const isDeliveryOrder = o.orderType === 'delivery';
    if (typeFilter === 'delivery' && !isDeliveryOrder) return false;
    return o.status === 'out_for_delivery' && ts >= dateThreshold;
  }).length;

  const sortedFiltered = [...filtered].sort((a, b) => {
    const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
    const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
    return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
  });

  async function advance(order: Order) {
    const isDelivery = order.orderType === 'delivery';
    if (isDelivery && order.status === 'ready') {
      const mode = (restaurant?.settings?.ordering as any)?.assignmentMode || 'self';
      if (mode === 'owner' || mode === 'hybrid') {
        setAssigningRiderOrder(order);
        return;
      }
    }

    const next: Record<string, Order['status']> = isDelivery ? {
      pending: 'accepted',
      accepted: 'preparing',
      preparing: 'ready',
      ready: 'out_for_delivery',
      out_for_delivery: 'delivered'
    } : {
      pending: 'accepted',
      accepted: 'preparing',
      preparing: 'ready',
      ready: 'served'
    };
    const s = next[order.status];
    if (!s) return;
    try {
      if (!isDemo && restaurantId) {
        await updateOrderStatus(restaurantId, order.id, s);
      }
      toast.success(t('orders.updateStatus'));
    } catch (err) {
      console.error('Failed to update order status:', err);
      toast.error('Failed to update order status');
    }
  }

  async function cancel(order: Order) {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      if (!isDemo && restaurantId) {
        await updateOrderStatus(restaurantId, order.id, 'cancelled');
      }
      toast.success(t('orders.updateStatus'));
      setSelectedOrderDetails(null);
      setPaymentSelectOrderId(null);
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast.error('Failed to cancel order');
    }
  }

  async function markPaid(order: Order, paymentMethod?: 'cash' | 'upi') {
    try {
      if (!isDemo && restaurantId) {
        await verifyOrderPayment(restaurantId, order.id, order.sessionId, undefined, paymentMethod);
      }
      toast.success(`Payment marked as paid (${paymentMethod ? paymentMethod.toUpperCase() : 'N/A'})`);
      setPaymentSelectOrderId(null);
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark payment as paid');
    }
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-left text-slate-900 dark:text-premium-text transition-colors duration-200"
    >
      <AdminHeader title={t('header.title.orders')}>
        <div className="flex items-center gap-3">
          <Button
            size="md"
            onClick={() => setIsPlaceOrderOpen(true)}
            className="shadow-premium"
          >
            + Place Order
          </Button>
          <Link
            to="/admin/requests"
            className="flex items-center gap-2 h-[42px] px-4 rounded-xl text-xs font-bold bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border text-slate-500 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text hover:bg-slate-50 dark:hover:bg-premium-hover transition shadow-sm dark:shadow-none"
          >
            <Bell className="w-4 h-4 text-premium-danger" />
            <span>Requests</span>
            {pendingRequestsCount > 0 && (
              <span className="w-5 h-5 bg-premium-danger text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                {pendingRequestsCount}
              </span>
            )}
          </Link>
        </div>
      </AdminHeader>

      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        {/* Filters */}
        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-4 shadow-sm dark:shadow-premium">
          <div className="flex flex-wrap gap-2 select-none">
            {(typeFilter === 'delivery' ? DELIVERY_TABS : NORMAL_TABS).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={clsx(
                  'px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition duration-150 relative border',
                  activeTab === tab
                    ? tab === 'extra' || tab === 'parcel'
                      ? 'bg-premium-warning/15 text-premium-warning border-premium-warning/30'
                      : 'bg-premium-primary/15 text-premium-primary border-premium-primary/30'
                    : 'bg-slate-50 dark:bg-premium-bg border-slate-200 dark:border-premium-border text-slate-550 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text hover:border-slate-300 dark:hover:border-premium-muted/30'
                )}
              >
                {tab === 'all' ? 'All' 
                  : tab === 'extra' ? 'Extra' 
                  : tab === 'parcel' ? 'Parcel' 
                  : tab === 'out_for_delivery' ? 'Out for Delivery'
                  : tab === 'delivered' ? 'Delivered'
                  : tab === 'cancelled' ? 'Cancelled'
                  : t(`orders.status.${tab}`)}
                {tab === 'pending' && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-premium-danger text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">{pendingCount}</span>
                )}
                {tab === 'accepted' && acceptedCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-premium-warning text-premium-bg text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">{acceptedCount}</span>
                )}
                {tab === 'out_for_delivery' && outForDeliveryCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-premium-warning text-premium-bg text-[10px] rounded-full flex items-center justify-center font-bold shadow-sm">{outForDeliveryCount}</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex gap-3 items-center flex-wrap w-full xl:w-auto">
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as 'all' | 'dinein' | 'delivery');
                setActiveTab('all');
              }}
              className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border text-slate-750 dark:text-premium-text hover:text-slate-950 dark:hover:text-premium-text text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-premium-primary cursor-pointer transition select-none h-[38px]"
            >
              <option value="all" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">All Types</option>
              <option value="dinein" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">🍽 Dine-In</option>
              <option value="delivery" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">🚴 Delivery</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | '7days' | 'month')}
              className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border text-slate-750 dark:text-premium-text hover:text-slate-950 dark:hover:text-premium-text text-xs font-bold rounded-xl px-4 py-2.5 focus:outline-none focus:border-premium-primary cursor-pointer transition select-none h-[38px]"
            >
              <option value="today" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">Today</option>
              <option value="7days" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">7 Days</option>
              <option value="month" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">Month</option>
            </select>

            <button
              onClick={() => setSortOrder(prev => prev === 'latest' ? 'oldest' : 'latest')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 dark:bg-premium-bg text-slate-650 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text border border-slate-200 dark:border-premium-border transition"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortOrder === 'latest' ? 'Latest First' : 'Oldest First'}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl text-slate-400 dark:text-premium-muted space-y-3 shadow-sm">
            <ClipboardList className="w-12 h-12 text-slate-200 dark:text-premium-border mx-auto" />
            <p className="text-sm font-semibold">{t('orders.noOrders')}</p>
          </div>
        ) : (
          <motion.div 
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <AnimatePresence mode="popLayout">
              {sortedFiltered.map(order => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <OrderCard 
                    order={order} 
                    allOrders={orders}
                    currency={currency}
                    onAdvance={advance}
                    onCancel={cancel}
                    onShowDetails={setSelectedOrderDetails}
                    t={t}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Details Dialog */}
        {(() => {
          const openOrder = selectedOrderDetails 
            ? orders.find(o => o.id === selectedOrderDetails.id) || selectedOrderDetails
            : null;

          if (!openOrder) return null;

          return (
            <Modal 
              open={!!selectedOrderDetails} 
              onClose={() => {
                setSelectedOrderDetails(null);
                setPaymentSelectOrderId(null);
              }}
              title={`Order Details #${openOrder.dailyOrderId || openOrder.id.slice(0, 8)}`}
              className="max-w-md"
            >
              <div className="space-y-5 text-left text-sm text-slate-500 dark:text-premium-muted select-none">
                {/* Status & Channel */}
                <div className="flex justify-between items-center border-b border-slate-200 dark:border-premium-border pb-3">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-premium-muted font-bold uppercase tracking-wider">Channel & Type</p>
                    <p className="text-slate-900 dark:text-premium-text font-bold mt-0.5">
                      {openOrder.orderType === 'delivery' ? '🚴 Online Delivery' : `🍽️ Dine-In (Table ${openOrder.tableNumber})`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={statusBadge(openOrder.status)}>
                        {t(`orders.status.${openOrder.status}`)}
                      </Badge>
                      {openOrder.paymentStatus && (
                        <Badge 
                          variant={openOrder.paymentStatus === 'paid' ? 'green' : openOrder.paymentStatus === 'verifying' ? 'amber' : 'gray'} 
                          className={clsx(
                            "text-[10px] py-0 px-1.5 leading-tight uppercase font-bold tracking-wider",
                            openOrder.paymentStatus === 'verifying' && 'animate-pulse'
                          )}
                        >
                          {openOrder.paymentStatus === 'paid' 
                            ? ((openOrder as any).paymentMethod || 'Paid') 
                            : openOrder.paymentStatus === 'verifying' ? 'Verifying' : 'Unpaid'}
                        </Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-premium-muted/80 font-mono">
                      {new Date(openOrder.createdAt?.toMillis ? openOrder.createdAt.toMillis() : Date.now()).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Customer Details */}
                <div className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-4 space-y-2">
                  <h4 className="text-premium-primary font-extrabold text-xs uppercase tracking-wider">Customer Info</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-premium-muted block">Name</span>
                      <span className="text-slate-900 dark:text-premium-text font-bold">{openOrder.customerName || 'Guest'}</span>
                    </div>
                    {openOrder.customerPhone && (
                      <div>
                        <span className="text-slate-500 dark:text-premium-muted block">Phone</span>
                        <a href={`tel:${openOrder.customerPhone}`} className="text-premium-primary hover:underline font-bold">
                          {openOrder.customerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                  {openOrder.orderType === 'delivery' && openOrder.assignedRiderId && (
                    <div className="pt-2 border-t border-slate-200 dark:border-premium-border/50 text-xs">
                      <span className="text-slate-500 dark:text-premium-muted block">Assigned Rider</span>
                      <span className="text-premium-warning font-bold flex items-center gap-1.5 mt-0.5">
                        <span>🚴</span>
                        <span>{openOrder.assignedRiderName || 'Rider'}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Delivery Address Details */}
                {openOrder.orderType === 'delivery' && openOrder.address && (
                  <div className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-4 space-y-2">
                    <h4 className="text-premium-primary font-extrabold text-xs uppercase tracking-wider">Delivery Address</h4>
                    <div className="text-xs space-y-1">
                      <p className="text-slate-900 dark:text-premium-text font-bold">{openOrder.address.name} ({openOrder.address.phone})</p>
                      <p className="text-slate-600 dark:text-premium-muted leading-relaxed">{openOrder.address.address}, {openOrder.address.street}</p>
                      {openOrder.address.landmark && (
                        <p className="text-slate-500 dark:text-premium-muted/70 italic mt-0.5">Landmark: {openOrder.address.landmark}</p>
                      )}
                      <p className="text-slate-600 dark:text-premium-muted">{openOrder.address.town}</p>
                    </div>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-2">
                  <h4 className="text-slate-900 dark:text-premium-text font-bold text-xs uppercase tracking-wider">Ordered Items</h4>
                  <div className="border border-slate-200 dark:border-premium-border rounded-xl p-4 space-y-2.5 bg-slate-50 dark:bg-premium-bg">
                    {openOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${item.isVeg ? 'bg-premium-success' : 'bg-premium-danger'}`} />
                          <span className="text-premium-text font-bold">
                            {item.qty}x {item.name}
                            {item.isExtra && (
                              <span className="ml-2 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-premium-warning/15 text-premium-warning border border-premium-warning/30 uppercase tracking-wide">
                                Extra
                              </span>
                            )}
                          </span>
                        </div>
                        <span className="text-premium-text font-bold">{currency}{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Note / Special request */}
                {openOrder.note && (
                  <div className="bg-premium-warning/5 border border-premium-warning/20 rounded-xl p-4 text-xs">
                    <span className="text-premium-warning font-bold block mb-0.5">Special Instructions:</span>
                    <p className="text-premium-text font-mono leading-relaxed">{openOrder.note}</p>
                  </div>
                )}

                {/* Price breakdown */}
                <div className="border-t border-slate-200 dark:border-premium-border pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500 dark:text-premium-muted font-semibold">
                    <span>Subtotal</span>
                    <span>{currency}{openOrder.subtotal ?? openOrder.totalAmount}</span>
                  </div>
                  {openOrder.taxes !== undefined && openOrder.taxes > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-premium-muted font-semibold">
                      <span>Taxes (CGST + SGST)</span>
                      <span>{currency}{openOrder.taxes}</span>
                    </div>
                  )}
                  {openOrder.platformFee !== undefined && openOrder.platformFee > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-premium-muted font-semibold">
                      <span>Platform Fee</span>
                      <span>{currency}{openOrder.platformFee}</span>
                    </div>
                  )}
                  {openOrder.deliveryFee !== undefined && openOrder.deliveryFee > 0 && (
                    <div className="flex justify-between text-slate-500 dark:text-premium-muted font-semibold">
                      <span>Delivery Fee</span>
                      <span>{currency}{openOrder.deliveryFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-slate-900 dark:text-premium-text text-sm pt-2.5 border-t border-slate-200 dark:border-premium-border">
                    <span>Grand Total</span>
                    <span className="text-base font-extrabold">{formatCurrency(openOrder.totalAmount, currency)}</span>
                  </div>
                </div>

                {/* Action buttons inside modal */}
                <div className="flex flex-col gap-2 pt-3 border-t border-slate-200 dark:border-premium-border">
                  {paymentSelectOrderId === openOrder.id ? (
                    <div className="space-y-2.5 w-full">
                      <p className="text-xs font-bold text-slate-500 dark:text-premium-muted uppercase tracking-wider text-center select-none">
                        Select Payment Method:
                      </p>
                      <div className="flex gap-2">
                        <Button
                          size="md"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          onClick={() => {
                            markPaid(openOrder, 'cash');
                          }}
                        >
                          💸 Cash
                        </Button>
                        <Button
                          size="md"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                          onClick={() => {
                            markPaid(openOrder, 'upi');
                          }}
                        >
                          📱 UPI
                        </Button>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="w-full text-slate-500 hover:text-slate-700"
                        onClick={() => setPaymentSelectOrderId(null)}
                      >
                        Cancel Selection
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2 w-full">
                      <div className="flex gap-3 w-full">
                        {(openOrder.paymentStatus === 'unpaid' || openOrder.paymentStatus === 'verifying') && (
                          <Button 
                            size="md" 
                            variant="primary"
                            className={`flex-1 ${
                              openOrder.paymentStatus === 'verifying' 
                                ? 'animate-pulse font-bold' 
                                : ''
                            }`}
                            onClick={() => {
                              setPaymentSelectOrderId(openOrder.id);
                            }}
                          >
                            {openOrder.paymentStatus === 'verifying' ? 'Confirm Payment' : 'Mark Paid'}
                          </Button>
                        )}
                        <Button 
                          size="md" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedOrderDetails(null);
                            setPaymentSelectOrderId(null);
                          }}
                        >
                          Close
                        </Button>
                      </div>

                      {openOrder.status !== 'cancelled' && (
                        <Button
                          size="md"
                          variant="danger"
                          className="w-full font-bold"
                          onClick={() => {
                            cancel(openOrder);
                          }}
                        >
                          🚫 Cancel Order
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Modal>
          );
        })()}
      </div>
      <PlaceOrderModal open={isPlaceOrderOpen} onClose={() => setIsPlaceOrderOpen(false)} />

      {/* Assign Rider Modal */}
      {assigningRiderOrder && (
        <Modal
          open={!!assigningRiderOrder}
          onClose={() => setAssigningRiderOrder(null)}
          title="Manual Rider Assignment"
          className="max-w-md"
        >
          <div className="space-y-5 text-left">
            <div>
              <p className="text-xs text-slate-500 dark:text-premium-muted leading-relaxed font-semibold">
                Select a trusted rider to deliver Order <span className="text-slate-900 dark:text-premium-text font-bold">#{(assigningRiderOrder.dailyOrderId || assigningRiderOrder.id.slice(0, 8))}</span> (Value: {formatCurrency(assigningRiderOrder.totalAmount, currency)}).
              </p>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-premium-muted" />
              <input
                type="text"
                placeholder="Search online riders by name..."
                value={riderSearch}
                onChange={e => setRiderSearch(e.target.value)}
                className="w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-premium-text placeholder-slate-400 dark:placeholder-premium-muted focus:outline-none focus:border-premium-primary transition h-[40px] font-semibold"
              />
            </div>

            {/* Riders List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin">
              {loadingRiders ? (
                <div className="flex flex-col items-center justify-center py-8 text-premium-muted gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-premium-primary" />
                  <span className="text-xs font-semibold">Loading active riders...</span>
                </div>
              ) : availableRiders.length === 0 ? (
                <div className="text-center py-8 text-slate-500 dark:text-premium-muted space-y-1 bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl">
                  <p className="text-xs font-bold text-premium-warning">No Idle Riders Online</p>
                  <p className="text-[10px] text-slate-500 dark:text-premium-muted max-w-[280px] mx-auto leading-relaxed px-4">
                    Available riders must set their status to Online and be free from active deliveries in the Rider App.
                  </p>
                </div>
              ) : (() => {
                const filteredRiders = availableRiders.filter(r => {
                  const q = riderSearch.toLowerCase();
                  return r.name.toLowerCase().includes(q) || r.phone.includes(q) || (r.vehicleNumber && r.vehicleNumber.toLowerCase().includes(q));
                });
                
                if (filteredRiders.length === 0) {
                  return (
                    <div className="text-center py-6 text-xs text-premium-muted">
                      No riders match "{riderSearch}"
                    </div>
                  );
                }

                return filteredRiders.map(rider => (
                  <div
                    key={rider.uid}
                    className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:border-premium-primary/40 rounded-xl transition group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-white dark:bg-premium-sidebar border border-slate-200 dark:border-premium-border flex items-center justify-center text-premium-primary text-xs font-extrabold capitalize select-none shadow-sm">
                        {rider.name.charAt(0)}
                      </div>
                      <div className="min-w-0 text-left">
                        <p className="text-xs font-bold text-slate-900 dark:text-premium-text leading-snug">{rider.name}</p>
                        <p className="text-[10px] text-slate-550 dark:text-premium-muted flex items-center gap-1.5 mt-0.5">
                          <Bike className="w-3.5 h-3.5 text-premium-primary" />
                          <span className="font-mono">{rider.vehicleNumber || rider.vehicle}</span>
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handleAssignRider(rider.uid)}
                      className="px-3.5 py-1.5 bg-premium-success hover:bg-green-600 text-premium-bg font-extrabold text-[10px] rounded-lg transition"
                    >
                      Assign
                    </button>
                  </div>
                ));
              })()}
            </div>

            {/* Hybrid Bypass Broadcast Action */}
            {(restaurant?.settings?.ordering as any)?.assignmentMode === 'hybrid' && (
              <div className="pt-3.5 border-t border-slate-200 dark:border-premium-border space-y-2">
                <p className="text-[10px] text-slate-500 dark:text-premium-muted leading-relaxed font-semibold">
                  <strong>Hybrid mode:</strong> You can broadcast this immediately to all riders to allow self-claiming without waiting for the 30-second timer.
                </p>
                <button
                  type="button"
                  onClick={handleBroadcastOrder}
                  className="w-full bg-premium-primary/15 hover:bg-premium-primary/20 border border-premium-primary/30 text-premium-primary font-bold text-xs py-2.5 rounded-xl transition flex items-center justify-center gap-1.5 min-h-[40px]"
                >
                  <Send className="w-3.5 h-3.5" /> Broadcast to All Riders
                </button>
              </div>
            )}

            <div className="pt-1.5">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setAssigningRiderOrder(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

interface OrderCardProps {
  order: Order;
  allOrders: Order[];
  currency: string;
  onAdvance: (o: Order) => void;
  onCancel: (o: Order) => void;
  onShowDetails: (o: Order) => void;
  t: (key: string) => string;
}

function OrderCard({ order, allOrders, currency, onAdvance, onCancel, onShowDetails, t }: OrderCardProps) {
  const getOrderNumber = () => {
    if (order.dailyOrderId) return order.dailyOrderId;
    
    const orderTimeMs = typeof order.createdAt?.toMillis === 'function' ? order.createdAt.toMillis() : Date.now();
    const orderDate = new Date(orderTimeMs);
    orderDate.setHours(0, 0, 0, 0);
    const todayStart = orderDate.getTime();
    const tomorrowStart = todayStart + 86400000;

    const sameDayOrders = allOrders.filter(o => {
      const t = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
      return t >= todayStart && t < tomorrowStart;
    }).sort((a, b) => {
      const tA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const tB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return tA - tB;
    });

    const idx = sameDayOrders.findIndex(o => o.id === order.id);
    return idx !== -1 ? idx + 1 : order.id.slice(-4);
  };

  return (
    <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-5 flex flex-col gap-4 text-left shadow-sm dark:shadow-premium hover:border-premium-primary/20 transition duration-200">
      <div className="flex justify-between items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-slate-900 dark:text-premium-text font-bold text-sm whitespace-nowrap shrink-0 flex items-center gap-1">
              <span>{order.orderType === 'delivery' ? '🚴' : '🍽️'}</span>
              <span>#{getOrderNumber()}</span>
              {order.orderType !== 'delivery' && !(order.isParcel || order.tableNumber === 'Takeaway') && (
                <span className="text-slate-550 dark:text-premium-muted font-bold text-xs ml-1">· Table {order.tableNumber}</span>
              )}
            </p>
            {order.paymentStatus && (
              <Badge 
                variant={order.paymentStatus === 'paid' ? 'green' : order.paymentStatus === 'verifying' ? 'amber' : 'gray'} 
                className={clsx(
                  "text-[9px] py-0.5 px-1.5 leading-tight uppercase font-extrabold tracking-wider whitespace-nowrap shrink-0",
                  order.paymentStatus === 'verifying' && 'animate-pulse'
                )}
              >
                {order.paymentStatus === 'paid' 
                  ? ((order as any).paymentMethod || 'Paid') 
                  : order.paymentStatus === 'verifying' ? 'Verifying' : 'Unpaid'}
              </Badge>
            )}
            {order.items.some(i => i.isExtra) && (
              <Badge variant="amber" className="text-[9px] py-0.5 px-1.5 leading-tight uppercase font-extrabold tracking-wider animate-pulse whitespace-nowrap shrink-0">
                Extra Added
              </Badge>
            )}
            {order.isParcel && (
              <Badge variant="amber" className="text-[9px] py-0.5 px-1.5 leading-tight uppercase font-extrabold tracking-wider whitespace-nowrap shrink-0">
                Parcel
              </Badge>
            )}
            {order.orderType === 'delivery' && order.assignedRiderId && (
              <Badge variant="blue" className="text-[9px] py-0.5 px-1.5 leading-tight uppercase font-extrabold tracking-wider whitespace-nowrap shrink-0">
                Rider: {order.assignedRiderName || 'Assigned'}
              </Badge>
            )}
          </div>
          {order.customerName && !order.customerName.toLowerCase().includes('walk-in') && !order.customerName.toLowerCase().includes('walk in') && (
            <p className="text-slate-550 dark:text-premium-muted text-xs mt-1.5 truncate font-semibold">{order.customerName}</p>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0 select-none">
          <Badge variant={statusBadge(order.status)} className="shrink-0 whitespace-nowrap">{t(`orders.status.${order.status}`)}</Badge>
          <span className="text-slate-500 dark:text-premium-muted text-[10px] shrink-0 whitespace-nowrap font-bold mt-1">{formatTimeAgo(order.createdAt)}</span>
        </div>
      </div>

      <div className="space-y-1.5">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className={`w-2.5 h-2.5 rounded-sm shrink-0 ${item.isVeg ? 'bg-premium-success' : 'bg-premium-danger'}`} />
            <span className="text-slate-650 dark:text-premium-muted flex-1 font-bold">
              {item.qty}x {item.name}
              {item.isExtra && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded text-[8px] font-extrabold bg-premium-warning/15 text-premium-warning border border-premium-warning/30 uppercase tracking-wider">
                  Extra
                </span>
              )}
            </span>
            <span className="text-slate-600 dark:text-premium-muted font-extrabold font-mono">{currency}{item.price * item.qty}</span>
          </div>
        ))}
      </div>

      {order.note && (
        <div 
          onClick={() => toast(`Request: "${order.note}"`, { icon: '💬', id: `note-${order.id}` })}
          className="bg-premium-warning/[0.04] border border-premium-warning/20 rounded-xl p-3 cursor-pointer hover:bg-premium-warning/[0.08] transition"
        >
          <p className="text-premium-warning text-xs font-bold flex items-center gap-1.5">
            <span>Special Request:</span>
            <span className="text-slate-600 dark:text-premium-muted font-medium font-mono truncate">{order.note}</span>
          </p>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 dark:border-premium-border/40 pt-3 select-none">
        <span className="text-slate-500 dark:text-premium-muted text-xs font-bold uppercase tracking-wider">{t('orders.total')}</span>
        <span className="text-slate-900 dark:text-premium-text font-extrabold text-sm font-mono">{formatCurrency(order.totalAmount, currency)}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-premium-border/40 select-none">
        <Button 
          size="sm" 
          variant="outline" 
          className="flex-grow min-w-[80px]" 
          onClick={() => onShowDetails(order)}
        >
          Details
        </Button>

        {order.status === 'pending' && (
          <>
            <Button size="sm" className="flex-grow" onClick={() => onAdvance(order)}>
              Accept
            </Button>
            <Button size="sm" variant="ghost" className="text-premium-danger hover:bg-premium-danger/10" onClick={() => onCancel(order)}>
              Reject
            </Button>
          </>
        )}
        {order.status === 'accepted' && (
          <>
            <Button size="sm" variant="outline" className="flex-grow border-premium-warning/40 text-premium-warning hover:bg-premium-warning/10 bg-transparent" onClick={() => onAdvance(order)}>
              Start Cooking
            </Button>
            <Button size="sm" variant="ghost" className="text-premium-danger hover:bg-premium-danger/10" onClick={() => onCancel(order)}>
              Reject
            </Button>
          </>
        )}
        {order.status === 'preparing' && (
          <>
            <Button size="sm" variant="outline" className="flex-grow border-premium-success/40 text-premium-success hover:bg-premium-success/10 bg-transparent" onClick={() => onAdvance(order)}>
              {t('orders.status.ready')}
            </Button>
            <Button size="sm" variant="ghost" className="text-premium-danger hover:bg-premium-danger/10" onClick={() => onCancel(order)}>
              {t('orders.status.cancelled')}
            </Button>
          </>
        )}
        {order.status === 'ready' && (
          <Button size="sm" className="flex-grow" onClick={() => onAdvance(order)}>
            {order.orderType === 'delivery' ? 'Handover' : 'Serve'}
          </Button>
        )}
        {order.status === 'out_for_delivery' && (
          <Button size="sm" className="flex-grow" onClick={() => onAdvance(order)}>
            Delivered
          </Button>
        )}
      </div>
    </div>
  );
}
