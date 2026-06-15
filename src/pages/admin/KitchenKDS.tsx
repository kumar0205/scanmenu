import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clock, Volume2, VolumeX, AlertTriangle, Check, ChefHat, Play, RotateCcw
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { updateOrderStatus, updateOrder } from '../../firebase/db';
import { playNotification } from '../../utils/notifications';
import toast from 'react-hot-toast';
import type { Order, OrderItem } from '../../types';

export default function KitchenKDS() {
  const { restaurantId, restaurant, isDemo } = useAuthContext();
  const { orders, loading } = useOrders(restaurantId);
  
  // Navigation tabs
  const tabs = ['active', 'pending', 'cooking', 'ready', 'completed', 'updates'] as const;
  type KDSTab = typeof tabs[number];
  const [activeTab, setActiveTab] = useState<KDSTab>('active');

  // Sound settings
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    const saved = localStorage.getItem('scanmenu_kds_muted');
    return saved === 'true';
  });

  // Local storage lists for acknowledged update alerts
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('scanmenu_kds_acknowledged_alerts');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Time tracking for active timers (refreshes every 10s)
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(interval);
  }, []);

  // Show all completed orders today toggle
  const [showAllCompleted, setShowAllCompleted] = useState(false);

  // Click focus highlight state
  const [highlightedOrderId, setHighlightedOrderId] = useState<string | null>(null);

  // Persist mute state
  useEffect(() => {
    localStorage.setItem('scanmenu_kds_muted', String(isMuted));
  }, [isMuted]);

  // Persist acknowledged alerts
  const acknowledgeAlert = (alertKey: string) => {
    setAcknowledgedAlerts(prev => {
      const updated = { ...prev, [alertKey]: true };
      localStorage.setItem('scanmenu_kds_acknowledged_alerts', JSON.stringify(updated));
      return updated;
    });
    toast.success('Alert cleared');
  };

  // Sound play handler (overriding or supplementing useOrders with mute state support)
  const lastOrderCountRef = useRef(0);
  useEffect(() => {
    const pendingOrdersCount = orders.filter(o => o.status === 'pending').length;
    if (pendingOrdersCount > lastOrderCountRef.current) {
      if (!isMuted) {
        playNotification(restaurant?.notificationSoundUrl);
      }
    }
    lastOrderCountRef.current = pendingOrdersCount;
  }, [orders, isMuted, restaurant]);

  // Test sound function
  const handleTestSound = () => {
    playNotification(restaurant?.notificationSoundUrl);
    toast.success('Sound check triggered!');
  };

  // Scroll and focus handler
  const handleFocusOrder = (orderId: string) => {
    setHighlightedOrderId(orderId);
    
    // Switch to 'active' tab if we are in another tab where the order might be hidden
    setActiveTab('active');

    setTimeout(() => {
      const el = document.getElementById(`order-card-${orderId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        toast.error('Order card not found in this view');
      }
    }, 100);

    // Clear highlight after 2.5s
    setTimeout(() => {
      setHighlightedOrderId(null);
    }, 2500);
  };

  // Helper to compute daily sequential order number starting from 1 (refreshes daily)
  const getOrderNumber = (order: Order) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();

    // Filter today's orders
    const todayOrders = orders.filter(o => {
      const oTime = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
      return oTime >= todayMs;
    });

    // Sort chronologically (oldest first)
    todayOrders.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });

    const idx = todayOrders.findIndex(o => o.id === order.id);
    if (idx === -1) {
      // Fallback: sort all available orders chronologically
      const allSorted = [...orders].sort((a, b) => {
        const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
        const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
        return timeA - timeB;
      });
      const allIdx = allSorted.findIndex(o => o.id === order.id);
      return allIdx !== -1 ? allIdx + 1 : 1;
    }
    return idx + 1;
  };

  // Calculate elapsed time helper
  const getElapsedTime = (createdAt: any) => {
    if (!createdAt) return '0 min';
    const createdMs = typeof createdAt.toMillis === 'function' ? createdAt.toMillis() : Date.now();
    const elapsedMs = now - createdMs;
    const mins = Math.floor(elapsedMs / 60000);
    return `${mins} min`;
  };

  // Find identical future items for batch suggestions
  const getBatchSuggestions = (currentItem: OrderItem, currentOrder: Order) => {
    const suggestions: Array<{ orderId: string; orderNumber: string; qty: number; hasNote: boolean }> = [];
    
    const currentOrderTime = typeof currentOrder.createdAt?.toMillis === 'function' 
      ? currentOrder.createdAt.toMillis() 
      : Date.now();

    // Find orders that are placed AFTER currentOrder and are pending or preparing
    const futureActiveOrders = orders.filter(o => {
      if (o.id === currentOrder.id) return false;
      if (o.status !== 'pending' && o.status !== 'preparing') return false;
      const oTime = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
      return oTime > currentOrderTime;
    });

    // Sort future orders oldest first
    futureActiveOrders.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });

    futureActiveOrders.forEach(o => {
      o.items.forEach(item => {
        if (item.name.toLowerCase().trim() === currentItem.name.toLowerCase().trim()) {
          // If the item in the future order is not ready yet, suggest it
          if (item.status !== 'ready') {
            suggestions.push({
              orderId: o.id,
              orderNumber: String(getOrderNumber(o)),
              qty: item.qty,
              hasNote: !!o.note || !!item.isExtra
            });
          }
        }
      });
    });

    return suggestions;
  };

  // Update item progress status
  const updateItemStatus = async (orderId: string, itemIndex: number, newStatus: 'pending' | 'preparing' | 'ready') => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;

    const updatedItems = order.items.map((item, idx) => {
      if (idx === itemIndex) {
        return { ...item, status: newStatus };
      }
      return item;
    });

    // Derive overall order status
    let nextOrderStatus = order.status;
    if (updatedItems.every(i => i.status === 'ready')) {
      nextOrderStatus = 'ready';
    } else if (updatedItems.some(i => i.status === 'preparing' || i.status === 'ready')) {
      if (order.status === 'pending') {
        nextOrderStatus = 'preparing';
      }
    } else {
      nextOrderStatus = 'pending';
    }

    try {
      if (!isDemo && restaurantId) {
        await updateOrder(restaurantId, orderId, {
          items: updatedItems,
          status: nextOrderStatus
        });
      } else {
        toast.success(`Updated item to ${newStatus} (Demo mode)`);
      }
    } catch {
      toast.error('Failed to update item status');
    }
  };

  // Start Cooking All items in order
  const handleStartCookingAll = async (order: Order) => {
    const updatedItems = order.items.map(item => ({ ...item, status: 'preparing' as const }));
    try {
      if (!isDemo && restaurantId) {
        await updateOrder(restaurantId, order.id, {
          items: updatedItems,
          status: 'preparing'
        });
      }
      toast.success('Cooking started for all items');
    } catch {
      toast.error('Failed to update order');
    }
  };

  // Mark Order Ready
  const handleMarkReadyAll = async (order: Order) => {
    const updatedItems = order.items.map(item => ({ ...item, status: 'ready' as const }));
    try {
      if (!isDemo && restaurantId) {
        await updateOrder(restaurantId, order.id, {
          items: updatedItems,
          status: 'ready'
        });
      }
      toast.success('Order marked as ready');
    } catch {
      toast.error('Failed to update order');
    }
  };

  // Cancel Order
  const handleCancelOrder = async (order: Order) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      if (!isDemo && restaurantId) {
        await updateOrderStatus(restaurantId, order.id, 'cancelled');
      }
      toast.success('Order cancelled');
    } catch {
      toast.error('Failed to cancel order');
    }
  };

  // Get active updates alerts
  const updateAlerts = useMemo(() => {
    const alerts: Array<{
      key: string;
      type: 'cancelled' | 'extra' | 'note';
      orderId: string;
      orderNumber: string;
      tableNumber: string;
      title: string;
      content: string;
    }> = [];

    const today = new Date().setHours(0, 0, 0, 0);

    orders.forEach(o => {
      const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
      if (ts < today) return; // Only process today's orders

      const orderNum = String(getOrderNumber(o));

      // 1. Cancellations
      if (o.status === 'cancelled') {
        const key = `cancel-${o.id}`;
        if (!acknowledgedAlerts[key]) {
          alerts.push({
            key,
            type: 'cancelled',
            orderId: o.id,
            orderNumber: orderNum,
            tableNumber: o.tableNumber,
            title: `Order #${orderNum} Cancelled`,
            content: `Table ${o.tableNumber || 'Takeaway'} order has been marked as cancelled by admin.`
          });
        }
      }

      // 2. Extra items added
      o.items.forEach(item => {
        if (item.isExtra) {
          const key = `extra-${o.id}-${item.itemId}`;
          if (!acknowledgedAlerts[key]) {
            alerts.push({
              key,
              type: 'extra',
              orderId: o.id,
              orderNumber: orderNum,
              tableNumber: o.tableNumber,
              title: `Extra Added: Order #${orderNum}`,
              content: `Table ${o.tableNumber || 'Takeaway'} added +${item.qty}x ${item.name}`
            });
          }
        }
      });

      // 3. Special customer notes
      if (o.note && o.note.trim() !== '') {
        const key = `note-${o.id}`;
        if (!acknowledgedAlerts[key]) {
          alerts.push({
            key,
            type: 'note',
            orderId: o.id,
            orderNumber: orderNum,
            tableNumber: o.tableNumber,
            title: `Note on Order #${orderNum}`,
            content: `Table ${o.tableNumber || 'Takeaway'} special instruction: "${o.note}"`
          });
        }
      }
    });

    return alerts;
  }, [orders, acknowledgedAlerts]);

  // Filter orders by active KDS tab
  const filteredOrders = useMemo(() => {
    // Sort active orders oldest first
    const active = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
    active.sort((a, b) => {
      const timeA = typeof a.createdAt?.toMillis === 'function' ? a.createdAt.toMillis() : Date.now();
      const timeB = typeof b.createdAt?.toMillis === 'function' ? b.createdAt.toMillis() : Date.now();
      return timeA - timeB;
    });

    if (activeTab === 'active') {
      return active;
    }
    if (activeTab === 'pending') {
      return active.filter(o => o.status === 'pending');
    }
    if (activeTab === 'cooking') {
      return active.filter(o => o.status === 'preparing');
    }
    if (activeTab === 'ready') {
      return active.filter(o => o.status === 'ready');
    }
    if (activeTab === 'completed') {
      const completed = orders.filter(o => o.status === 'completed');
      // Sort completed newest first
      completed.sort((a, b) => {
        const timeA = typeof a.updatedAt?.toMillis === 'function' ? a.updatedAt.toMillis() : Date.now();
        const timeB = typeof b.updatedAt?.toMillis === 'function' ? b.updatedAt.toMillis() : Date.now();
        return timeB - timeA;
      });

      if (showAllCompleted) {
        const today = new Date().setHours(0, 0, 0, 0);
        return completed.filter(o => {
          const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
          return ts >= today;
        });
      }

      // Default: auto-hide after 5 minutes
      return completed.filter(o => {
        const updatedMs = typeof o.updatedAt?.toMillis === 'function' ? o.updatedAt.toMillis() : Date.now();
        return Date.now() - updatedMs < 5 * 60 * 1000;
      });
    }
    return [];
  }, [orders, activeTab, showAllCompleted]);

  return (
    <div className="bg-[#0a0a0a] min-h-screen text-zinc-100 flex flex-col">
      {/* Header bar */}
      <header className="bg-[#111111] border-b border-[#222222] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#22c55e]/15 border border-[#22c55e]/30 rounded-xl flex items-center justify-center text-[#22c55e]">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Kitchen Display System</h1>
            <p className="text-xs text-zinc-500">Real-time Order Preparation Console</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Test chime */}
          <button
            onClick={handleTestSound}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1a1a] hover:bg-[#252525] text-zinc-300 border border-[#2d2d2d] transition-all"
            title="Test notification sound chime"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Test Sound</span>
          </button>

          {/* Mute settings */}
          <button
            onClick={() => {
              setIsMuted(!isMuted);
              toast.success(isMuted ? 'Sound Alerts ON' : 'Sound Alerts MUTED');
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              isMuted 
                ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' 
                : 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
            }`}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            <span>{isMuted ? 'Muted' : 'Sound On'}</span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#111111]/40 border-b border-[#222222] px-6 py-2 sticky top-[73px] z-20 backdrop-blur-md">
        <div className="flex flex-wrap gap-1">
          {tabs.map(tab => {
            const count = tab === 'updates' 
              ? updateAlerts.length 
              : tab === 'completed' 
                ? filteredOrders.length 
                : orders.filter(o => {
                    if (o.status === 'completed' || o.status === 'cancelled') return false;
                    if (tab === 'active') return true;
                    if (tab === 'pending') return o.status === 'pending';
                    if (tab === 'cooking') return o.status === 'preparing';
                    if (tab === 'ready') return o.status === 'ready';
                    return false;
                  }).length;

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-all relative ${
                  activeTab === tab
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/40'
                }`}
              >
                <span>{tab}</span>
                {count > 0 && (
                  <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    tab === 'updates' 
                      ? 'bg-red-500 text-white animate-pulse' 
                      : tab === 'ready'
                        ? 'bg-green-500 text-black'
                        : 'bg-zinc-700 text-zinc-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-6 overflow-y-auto">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-[#121212] border border-[#222222] rounded-2xl h-56 animate-pulse" />
            ))}
          </div>
        ) : activeTab === 'updates' ? (
          /* Updates alert tab */
          updateAlerts.length === 0 ? (
            <div className="text-center py-20 bg-[#111111]/30 border border-dashed border-[#222222] rounded-2xl">
              <ChefHat className="w-16 h-16 text-zinc-800 mx-auto mb-4" />
              <p className="text-zinc-400 font-medium">No kitchen updates</p>
              <p className="text-xs text-zinc-600 mt-1">Extra items, notes, or cancellations will show up here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {updateAlerts.map(alert => (
                <div 
                  key={alert.key} 
                  className={`bg-[#121212] border rounded-2xl p-5 flex flex-col justify-between transition-all ${
                    alert.type === 'cancelled' 
                      ? 'border-red-500/30 shadow-lg shadow-red-950/15' 
                      : alert.type === 'extra'
                        ? 'border-amber-500/30'
                        : 'border-blue-500/30'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className={`w-5 h-5 shrink-0 ${
                          alert.type === 'cancelled' ? 'text-red-400' : alert.type === 'extra' ? 'text-amber-400' : 'text-blue-400'
                        }`} />
                        <span className="font-bold text-base text-white">{alert.title}</span>
                      </div>
                      <span className="text-xs font-bold bg-[#1d1d1d] text-zinc-400 px-2.5 py-0.5 rounded-full">
                        Table {alert.tableNumber || 'Takeaway'}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-sm leading-relaxed">{alert.content}</p>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <button
                      onClick={() => handleFocusOrder(alert.orderId)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-[#2d2d2d] transition-all"
                    >
                      Locate Order
                    </button>
                    <button
                      onClick={() => acknowledgeAlert(alert.key)}
                      className="flex-1 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-[#2d2d2d] transition-all"
                    >
                      Acknowledge
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : filteredOrders.length === 0 ? (
          /* Empty state */
          <div className="text-center py-20 bg-[#111111]/30 border border-dashed border-[#222222] rounded-2xl">
            <ChefHat className="w-16 h-16 text-zinc-850 mx-auto mb-4" />
            <p className="text-zinc-400 font-medium">No orders in this section</p>
            <p className="text-xs text-zinc-650 mt-1">Orders placed by customers will stream here automatically.</p>
          </div>
        ) : (
          /* Order grid */
          <div className="space-y-6">
            {activeTab === 'completed' && (
              <div className="flex justify-end">
                <label className="flex items-center gap-2 text-xs text-zinc-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showAllCompleted}
                    onChange={(e) => setShowAllCompleted(e.target.checked)}
                    className="rounded bg-[#1a1a1a] border-[#2d2d2d] text-zinc-700 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>Show all completed orders today</span>
                </label>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
              {filteredOrders.map(order => {
                const orderNum = getOrderNumber(order);
                const isHighlighted = highlightedOrderId === order.id;

                return (
                  <div
                    key={order.id}
                    id={`order-card-${order.id}`}
                    className={`bg-[#121212] border rounded-2xl p-5 flex flex-col gap-4 transition-all duration-300 relative ${
                      isHighlighted
                        ? 'border-green-500 ring-2 ring-green-500/30 scale-[1.02] shadow-lg shadow-green-950/20'
                        : 'border-[#222222] hover:border-zinc-700/60'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-[#222222] pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-lg text-white whitespace-nowrap shrink-0">Order #{orderNum}</span>
                          <span className="text-xs bg-[#1a1a1a] text-zinc-400 font-semibold px-2 py-0.5 rounded whitespace-nowrap shrink-0">
                            Table {order.tableNumber || 'Takeaway'}
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-650 uppercase tracking-wider font-semibold mt-1">
                          Status: {order.status}
                        </p>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-400 text-sm font-semibold">
                        <Clock className="w-3.5 h-3.5 text-zinc-500" />
                        <span>{getElapsedTime(order.createdAt)}</span>
                      </div>
                    </div>

                    {/* Items List */}
                    <div className="flex-1 space-y-4">
                      {order.items.map((item, idx) => {
                        const isItemReady = item.status === 'ready';
                        const isItemPreparing = item.status === 'preparing';
                        const suggestions = getBatchSuggestions(item, order);

                        return (
                          <div key={idx} className="space-y-1.5 border-b border-[#1b1b1b] pb-3 last:border-none last:pb-0">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                <div>
                                  <p className={`text-base font-semibold ${isItemReady ? 'line-through text-zinc-600' : 'text-zinc-100'}`}>
                                    <span className="text-white font-bold mr-1.5">{item.qty}x</span>
                                    {item.name}
                                  </p>
                                  {/* Special request / item notes */}
                                  {item.isExtra && (
                                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/20 uppercase tracking-wide whitespace-nowrap shrink-0">
                                      Extra Added
                                    </span>
                                  )}
                                  {order.note && order.note.trim() !== '' && (
                                    <button
                                      onClick={() => toast(`Request: "${order.note}"`, { icon: '💬', id: `note-${order.id}`, duration: 5000 })}
                                      className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 cursor-pointer transition-all select-none text-left"
                                    >
                                      💬 Note: {order.note}
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* Item Cook Controls */}
                              {order.status !== 'completed' && order.status !== 'cancelled' && (
                                <div className="flex items-center gap-1 shrink-0">
                                  {isItemReady ? (
                                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20">
                                      <Check className="w-3.5 h-3.5" /> Done
                                    </span>
                                  ) : isItemPreparing ? (
                                    <>
                                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
                                        Cooking...
                                      </span>
                                      <button
                                        onClick={() => updateItemStatus(order.id, idx, 'ready')}
                                        className="p-1 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                        title="Complete Item"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => updateItemStatus(order.id, idx, 'preparing')}
                                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-[#2d2d2d] transition-all"
                                      >
                                        Fire
                                      </button>
                                      <button
                                        onClick={() => updateItemStatus(order.id, idx, 'ready')}
                                        className="p-1 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors"
                                        title="Complete Item"
                                      >
                                        <Check className="w-4 h-4" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Batch Suggestions */}
                            {suggestions.length > 0 && !isItemReady && (
                              <div className="flex flex-wrap items-center gap-1.5 pl-4.5 text-xs text-zinc-500">
                                <span className="text-[11px] font-medium opacity-60">also needed →</span>
                                {suggestions.map((sug, sIdx) => (
                                  <button
                                    key={sIdx}
                                    onClick={() => handleFocusOrder(sug.orderId)}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border transition-all ${
                                      sug.hasNote
                                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/20'
                                        : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border-green-500/20'
                                    }`}
                                    title={sug.hasNote ? 'Future order has special notes' : 'Safe to batch cook'}
                                  >
                                    <span>[O-{sug.orderNumber} ×{sug.qty}]</span>
                                    <span>{sug.hasNote ? '⚠' : '✓'}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Actions */}
                    {order.status !== 'completed' && order.status !== 'cancelled' && (
                      <div className="border-t border-[#222222] pt-4 mt-2">
                        {order.status === 'pending' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartCookingAll(order)}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-[#1a1a1a] hover:bg-[#252525] text-white border border-[#2d2d2d] transition-all"
                            >
                              Start Cooking All
                            </button>
                            <button
                              onClick={() => handleMarkReadyAll(order)}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-all shadow-md shadow-green-950/20"
                            >
                              Mark Prepared
                            </button>
                          </div>
                        )}

                        {order.status === 'preparing' && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleMarkReadyAll(order)}
                              className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-500 text-white transition-all shadow-md"
                            >
                              Mark Prepared
                            </button>
                            <button
                              onClick={() => handleCancelOrder(order)}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-850 hover:text-red-400 text-zinc-550 border border-[#2d2d2d] transition-all"
                              title="Cancel Order"
                            >
                              Cancel
                            </button>
                          </div>
                        )}

                        {order.status === 'ready' && (
                          <div className="flex gap-2 w-full">
                            <span className="flex-1 py-2 rounded-xl text-xs font-bold bg-green-500/10 text-green-400 border border-green-500/20 text-center flex items-center justify-center gap-1.5">
                              <Check className="w-3.5 h-3.5" /> Prepared & Ready to Serve
                            </span>
                            <button
                              onClick={() => {
                                // Reset statuses to preparing
                                handleStartCookingAll(order);
                              }}
                              className="px-3 py-2 rounded-xl text-xs font-bold bg-zinc-900 hover:bg-zinc-850 hover:text-zinc-300 text-zinc-500 border border-[#2d2d2d] transition-all flex items-center justify-center gap-1"
                              title="Send back to Cooking"
                            >
                              <RotateCcw className="w-3.5 h-3.5" /> Recall
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
