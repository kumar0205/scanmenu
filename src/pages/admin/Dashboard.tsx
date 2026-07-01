import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  DollarSign, TrendingUp, Grid3X3, UtensilsCrossed, ClipboardList, 
  QrCode, ExternalLink, Link2, ShoppingCart, ArrowRight 
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useDashboardMetrics } from '../../hooks/useDashboardMetrics';
import { useMenu } from '../../hooks/useMenu';
import { useNow } from '../../hooks/useNow';
import { db } from '../../firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { formatCurrency, formatTimeAgo } from '../../utils/formatters';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { ResponsiveContainer, LineChart, Line } from 'recharts';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import type { Table } from '../../types';

// Mock sparkline trends (10 data points)
const mockSparklines = {
  revenue: [{ v: 40 }, { v: 45 }, { v: 42 }, { v: 50 }, { v: 48 }, { v: 55 }, { v: 52 }, { v: 60 }, { v: 58 }, { v: 65 }],
  aov: [{ v: 210 }, { v: 220 }, { v: 215 }, { v: 230 }, { v: 225 }, { v: 240 }, { v: 235 }, { v: 250 }, { v: 242 }, { v: 255 }],
  tables: [{ v: 4 }, { v: 6 }, { v: 5 }, { v: 8 }, { v: 7 }, { v: 9 }, { v: 8 }, { v: 10 }, { v: 9 }, { v: 12 }],
};

export default function Dashboard() {
  const { restaurant, restaurantId, globalSelectedDate, setGlobalSelectedDate } = useAuthContext();
  const { t } = useI18n();
  const todayStr = useMemo(() => {
    const now = new Date();
    const istTime = new Date(now.getTime() + (330 * 60000));
    return istTime.toISOString().split('T')[0];
  }, []);
  const { metrics, loading: metricsLoading } = useDashboardMetrics(restaurantId, globalSelectedDate);
  useMenu(restaurantId);
  const [tables, setTables] = useState<Table[]>([]);
  useNow(1000);

  useEffect(() => {
    if (!restaurantId) return;

    const qTables = query(collection(db, 'restaurants', restaurantId, 'tables'));
    const unsub = onSnapshot(qTables, (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Table));
      setTables(list.sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true })));
    });

    return () => unsub();
  }, [restaurantId]);

  const currency = restaurant?.currency ?? '₹';
  const menuUrl = restaurant ? `${window.location.origin}/menu/${restaurant.slug}` : '#';

  const copyLink = () => {
    navigator.clipboard.writeText(menuUrl);
    toast.success(t('dashboard.linkCopied'), { id: 'copy-link' });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('generic.goodMorning') || 'Good Morning';
    if (hour < 17) return t('generic.goodAfternoon') || 'Good Afternoon';
    return t('generic.goodEvening') || 'Good Evening';
  };

  const activeTables = tables.filter(t => t.status === 'occupied').length;

  const stats = [
    { 
      icon: DollarSign, 
      label: globalSelectedDate === todayStr ? (t('dashboard.todayRevenue') || 'Today\'s Revenue') : 'Revenue', 
      value: formatCurrency(metrics.todayRevenue, currency), 
      loading: metricsLoading,
      trend: globalSelectedDate === todayStr ? '+8.2%' : undefined,
      sparkData: mockSparklines.revenue,
      color: 'stroke-emerald-500'
    },
    { 
      icon: TrendingUp, 
      label: globalSelectedDate === todayStr ? 'Avg Order Value (AOV)' : 'Date Avg Order Value', 
      value: formatCurrency(metrics.averageOrderValue, currency), 
      loading: metricsLoading,
      trend: globalSelectedDate === todayStr ? '+2.4%' : undefined,
      sparkData: mockSparklines.aov,
      color: 'stroke-indigo-500'
    },
    { 
      icon: Grid3X3, 
      label: globalSelectedDate === todayStr ? (t('dashboard.activeTables') || 'Active Tables') : 'Tables Active', 
      value: activeTables, 
      loading: false,
      trend: globalSelectedDate === todayStr ? 'Live' : undefined,
      sparkData: mockSparklines.tables,
      color: 'stroke-amber-500'
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-left text-slate-900 dark:text-premium-text transition-colors duration-200"
    >
      <AdminHeader title={t('header.title.dashboard')} />
      <div className="p-8 space-y-8 max-w-[1600px] mx-auto">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between border-b border-slate-200 dark:border-premium-border pb-6">
          <div>
            <h2 className="text-slate-950 dark:text-premium-text text-[32px] font-bold tracking-tight leading-tight">
              {getGreeting()}, {restaurant?.name ?? ''}!
            </h2>
            <p className="text-slate-500 dark:text-premium-muted text-sm mt-1">{t('dashboard.greeting')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 select-none">
            <input
              type="date"
              value={globalSelectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setGlobalSelectedDate(e.target.value);
                }
              }}
              className="bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-premium-border text-slate-700 dark:text-premium-text text-sm px-3.5 py-2 rounded-xl transition duration-150 font-bold shadow-sm focus:outline-none focus:border-premium-primary h-[40px]"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 bg-white dark:bg-[#1E293B] border border-slate-300 dark:border-premium-border text-slate-700 dark:text-premium-text hover:bg-slate-50 dark:hover:bg-premium-hover text-sm px-4 py-2.5 rounded-xl transition duration-150 font-bold shadow-sm h-[40px]"
            >
              <Link2 className="w-4 h-4 text-premium-primary" /> {t('dashboard.copyLink')}
            </button>
            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-premium-primary hover:bg-blue-650 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition duration-150 shadow-premium h-[40px]"
            >
              {t('dashboard.viewMenu')} <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map(({ icon: Icon, label, value, loading, trend, sparkData, color }) => (
            <div 
              key={label} 
              className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium hover:-translate-y-0.5 hover:border-premium-primary/30 transition-all duration-200 group flex flex-col justify-between min-h-[145px]"
            >
              <div className="flex justify-between items-center select-none">
                <div className="w-10 h-10 rounded-xl bg-premium-primary/10 border border-premium-primary/20 flex items-center justify-center text-premium-primary shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <span className={clsx(
                  "text-[11px] font-bold px-2.5 py-0.5 rounded-full select-none border",
                  trend === 'Live' 
                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                    : 'bg-premium-success/10 text-premium-success border-premium-success/20'
                )}>
                  {trend}
                </span>
              </div>
              
              <div className="flex items-end justify-between mt-4">
                <div className="min-w-0 flex-1 pr-2">
                  {loading ? (
                    <Skeleton className="h-9 w-20 bg-slate-200 dark:bg-premium-border rounded-lg" />
                  ) : (
                    <p className="text-slate-900 dark:text-premium-text text-[36px] font-extrabold leading-none tracking-tight truncate">{value}</p>
                  )}
                  <p className="text-slate-500 dark:text-premium-muted text-[10px] font-bold uppercase tracking-wider mt-2.5 truncate">{label}</p>
                </div>
                
                <div className="w-20 h-9 opacity-65 group-hover:opacity-100 transition-opacity shrink-0 select-none">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparkData}>
                      <Line type="monotone" dataKey="v" stroke="currentColor" className={color} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 space-y-5 shadow-sm dark:shadow-premium">
              <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold">Live Status Breakdown</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Pending', count: metrics.pendingCount, color: 'text-premium-warning bg-premium-warning/5 border-premium-warning/20' },
                  { label: 'Preparing', count: metrics.preparingCount, color: 'text-indigo-500 bg-indigo-500/5 border-indigo-500/20' },
                  { label: 'Ready', count: metrics.readyCount, color: 'text-premium-success bg-premium-success/5 border-premium-success/20' },
                  { label: 'Served', count: metrics.servedCount, color: 'text-purple-500 bg-purple-500/5 border-purple-500/20' },
                  { label: 'Out for Delivery', count: metrics.outForDeliveryCount, color: 'text-pink-500 bg-pink-500/5 border-pink-500/20' },
                  { label: 'Delivered', count: metrics.deliveredCount, color: 'text-blue-500 bg-blue-500/5 border-blue-500/20' },
                  { label: 'Cancelled', count: metrics.cancelledCount, color: 'text-premium-danger bg-premium-danger/5 border-premium-danger/20' }
                ].map(st => (
                  <div key={st.label} className={`border rounded-xl p-4 flex flex-col justify-center items-center select-none transition-colors duration-150 ${st.color}`}>
                    <span className="text-[26px] font-extrabold tracking-tight">{metricsLoading ? '--' : st.count}</span>
                    <span className="text-[10px] uppercase font-extrabold mt-1.5 text-center opacity-85">{st.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
              <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold mb-4">{t('dashboard.tableOverview')}</h3>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                {tables.map(table => (
                  <div
                    key={table.id}
                    className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center transition-all duration-150 ${
                      table.status === 'available' ? 'border-premium-success bg-premium-success/10 text-premium-success hover:bg-premium-success/15' :
                      table.status === 'occupied' ? 'border-premium-warning bg-premium-warning/10 text-premium-warning hover:bg-premium-warning/15' :
                      'border-slate-200 dark:border-premium-border bg-slate-50 dark:bg-premium-bg/50 text-slate-400 dark:text-premium-muted'
                    }`}
                  >
                    <span className="font-extrabold text-sm select-none">{table.number}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-6 border-t border-slate-200 dark:border-premium-border/40 pt-4">
                {[
                  { color: 'bg-premium-success', label: t('dashboard.available') },
                  { color: 'bg-premium-warning', label: t('dashboard.occupied') },
                  { color: 'bg-slate-300 dark:bg-premium-border', label: t('dashboard.inactive') },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 select-none">
                    <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-slate-500 dark:text-premium-muted text-xs font-semibold">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 space-y-4 shadow-sm dark:shadow-premium">
              <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold">Order Channels</h3>
              <div className="flex gap-4">
                <div className="flex-1 bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-4 text-center">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-premium-text">{metricsLoading ? '--' : metrics.dineInCount}</span>
                  <p className="text-[10px] text-slate-500 dark:text-premium-muted uppercase font-bold mt-1.5 tracking-wider">🍽️ Dine-In</p>
                </div>
                <div className="flex-1 bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl p-4 text-center">
                  <span className="text-2xl font-extrabold text-slate-900 dark:text-premium-text">{metricsLoading ? '--' : metrics.deliveryCount}</span>
                  <p className="text-[10px] text-slate-500 dark:text-premium-muted uppercase font-bold mt-1.5 tracking-wider">🚴 Delivery</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 space-y-4 shadow-sm dark:shadow-premium">
              <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-premium-success" /> Top Selling Items
              </h3>
              {metricsLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-6 w-full bg-slate-200 dark:bg-premium-border" />)}
                </div>
              ) : metrics.topItems.length === 0 ? (
                <p className="text-slate-500 dark:text-premium-muted text-xs py-2 italic font-semibold">No items sold today</p>
              ) : (
                <div className="space-y-3">
                  {metrics.topItems.map((item, idx) => (
                    <div key={item.name} className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-premium-border/30 pb-2 last:border-0 last:pb-0">
                      <span className="text-slate-500 dark:text-premium-muted font-bold truncate max-w-[180px]">
                        {idx + 1}. {item.name}
                      </span>
                      <span className="text-premium-success font-extrabold font-mono bg-premium-success/10 px-2 py-0.5 rounded border border-premium-success/20 shrink-0">
                        x{item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold px-1">{t('dashboard.quickActions')}</h3>
              {[
                { icon: UtensilsCrossed, title: t('dashboard.manageMenu'), desc: t('dashboard.manageMenuDesc'), to: '/admin/menu' },
                { icon: ClipboardList, title: t('dashboard.viewOrders'), desc: t('dashboard.viewOrdersDesc'), to: '/admin/orders' },
                { icon: QrCode, title: t('dashboard.qrCodes'), desc: t('dashboard.qrCodesDesc'), to: '/admin/tables' },
              ].map(({ icon: Icon, title, desc, to }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-start gap-3 bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl p-4 hover:border-premium-primary hover:-translate-y-0.5 transition-all duration-150 group shadow-sm dark:shadow-premium"
                >
                  <div className="w-9 h-9 rounded-lg bg-premium-primary/10 border border-premium-primary/20 flex items-center justify-center shrink-0">
                    <Icon className="w-4.5 h-4.5 text-premium-primary" />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-slate-900 dark:text-premium-text text-sm font-bold group-hover:text-premium-primary transition-colors">{title}</p>
                    <p className="text-slate-500 dark:text-premium-muted text-[11px] mt-0.5 leading-snug font-semibold">{desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 dark:text-premium-muted group-hover:text-premium-primary transition-colors shrink-0 mt-0.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium text-left">
          <div className="flex items-center justify-between mb-4 border-b border-slate-200 dark:border-premium-border/40 pb-3">
            <h3 className="text-slate-900 dark:text-premium-text text-[16px] font-bold">{t('dashboard.recentOrders')}</h3>
            <Link to="/admin/orders" className="text-premium-primary text-sm font-extrabold hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {metricsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full bg-slate-200 dark:bg-premium-border" />)}
            </div>
          ) : metrics.recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-slate-300 dark:text-premium-border mx-auto mb-3" />
              <p className="text-slate-500 dark:text-premium-muted text-sm font-semibold">{t('dashboard.noOrders')}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-premium-border/40">
              {metrics.recentOrders.map(o => (
                <div key={o.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-4 first:pt-0 last:pb-0 hover:bg-slate-50 dark:hover:bg-premium-hover/10 px-2 rounded-lg transition-colors">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5 min-w-0">
                      <span className="text-slate-900 dark:text-premium-text text-sm font-bold whitespace-nowrap shrink-0 flex items-center gap-1.5">
                        <span>{o.orderType === 'delivery' ? '🚴 Delivery' : `🍽️ Table ${o.tableNumber}`}</span>
                      </span>
                      <span className="text-slate-500 dark:text-premium-muted text-xs font-bold truncate max-w-[150px] shrink-0">· {o.customerName}</span>
                      {o.items.some(i => i.isExtra) && (
                        <Badge variant="amber" className="text-[9px] py-0.5 px-1.5 leading-tight uppercase font-extrabold tracking-wider animate-pulse whitespace-nowrap shrink-0">
                          Extra Added
                        </Badge>
                      )}
                    </div>
                    <p className="text-slate-500 dark:text-premium-muted text-xs mt-1.5 truncate max-w-xl font-semibold">
                      {o.items.map(i => `${i.qty}x ${i.name}${i.isExtra ? ' (Extra)' : ''}`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 self-end sm:self-auto shrink-0 select-none">
                    <Badge variant={statusBadge(o.status)}>{t(`orders.status.${o.status}`)}</Badge>
                    <span className="text-slate-500 dark:text-premium-muted text-xs shrink-0 font-bold">{formatTimeAgo(o.createdAt)}</span>
                    <span className="text-slate-900 dark:text-premium-text text-sm font-extrabold shrink-0 font-mono w-20 text-right">{formatCurrency(o.totalAmount, currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
