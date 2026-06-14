import { useState, useEffect } from 'react';
import { TrendingUp, Calendar, DollarSign, ShoppingBag } from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { subscribeToOrders } from '../../firebase/db';
import { formatCurrency } from '../../utils/formatters';
import type { Order } from '../../types';

function getLast7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  return days;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Analytics() {
  const { restaurantId, restaurant } = useAuthContext();
  const { t } = useI18n();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const currency = restaurant?.currency ?? '₹';

  useEffect(() => {
    if (!restaurantId) return;
    return subscribeToOrders(restaurantId, o => { setOrders(o); setLoading(false); });
  }, [restaurantId]);

  const days = getLast7Days();
  const revenueData = days.map(d => {
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const dayOrders = orders.filter(o => {
      const ts = o.createdAt?.toMillis() ?? 0;
      return ts >= start.getTime() && ts <= end.getTime() && o.status === 'completed';
    });
    return {
      day: DAY_LABELS[d.getDay()],
      revenue: dayOrders.reduce((s, o) => s + o.totalAmount, 0),
      orders: dayOrders.length,
    };
  });

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => (o.createdAt?.toMillis() ?? 0) >= today.getTime());
  const todayRevenue = todayOrders.filter(o => o.status === 'completed').reduce((s, o) => s + o.totalAmount, 0);
  const completedOrders = orders.filter(o => o.status === 'completed');
  const totalRevenue = completedOrders.reduce((s, o) => s + o.totalAmount, 0);
  const avgOrderValue = completedOrders.length ? Math.round(totalRevenue / completedOrders.length) : 0;

  const statusData = ['pending', 'preparing', 'ready', 'completed', 'cancelled'].map(s => ({
    status: t(`orders.status.${s}`) || s.charAt(0).toUpperCase() + s.slice(1),
    count: orders.filter(o => o.status === s).length,
  }));

  const itemMap = new Map<string, { name: string; count: number; revenue: number; isVeg: boolean }>();
  completedOrders.forEach(o => {
    o.items.forEach(item => {
      const existing = itemMap.get(item.itemId);
      if (existing) {
        existing.count += item.qty;
        existing.revenue += item.price * item.qty;
      } else {
        itemMap.set(item.itemId, { name: item.name, count: item.qty, revenue: item.price * item.qty, isVeg: item.isVeg });
      }
    });
  });
  const topItems = Array.from(itemMap.values()).sort((a, b) => b.count - a.count).slice(0, 10);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm">
        <p className="text-[#a1a1aa]">{label}</p>
        <p className="text-white font-medium">{formatCurrency(payload[0].value, currency)}</p>
      </div>
    );
  };

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.analytics')} />
      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.15)] flex items-center justify-center mb-3">
              <DollarSign className="w-5 h-5 text-[#22c55e]" />
            </div>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : (
              <p className="text-white text-2xl font-semibold">{formatCurrency(totalRevenue, currency)}</p>
            )}
            <p className="text-[#a1a1aa] text-xs mt-0.5">Total Revenue (All Time)</p>
          </div>
          
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-[rgba(59,130,246,0.15)] flex items-center justify-center mb-3">
              <ShoppingBag className="w-5 h-5 text-[#3b82f6]" />
            </div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <p className="text-white text-2xl font-semibold">{completedOrders.length}</p>
            )}
            <p className="text-[#a1a1aa] text-xs mt-0.5">Total Completed Orders</p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-[rgba(168,85,247,0.15)] flex items-center justify-center mb-3">
              <Calendar className="w-5 h-5 text-[#a855f7]" />
            </div>
            {loading ? <Skeleton className="h-8 w-16 mb-1" /> : (
              <p className="text-white text-2xl font-semibold">{todayOrders.filter(o => o.status === 'completed').length}</p>
            )}
            <p className="text-[#a1a1aa] text-xs mt-0.5">{t('dashboard.todayOrders')} · {formatCurrency(todayRevenue, currency)}</p>
          </div>

          <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
            <div className="w-10 h-10 rounded-lg bg-[rgba(245,158,11,0.15)] flex items-center justify-center mb-3">
              <TrendingUp className="w-5 h-5 text-[#f59e0b]" />
            </div>
            {loading ? <Skeleton className="h-8 w-24 mb-1" /> : (
              <p className="text-white text-2xl font-semibold">{formatCurrency(avgOrderValue, currency)}</p>
            )}
            <p className="text-[#a1a1aa] text-xs mt-0.5">Avg Order Value</p>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">{t('analytics.revenue')} — Last 7 Days</h3>
          {loading ? <Skeleton className="h-48 w-full" /> : (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={revenueData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="greenGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="day" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#22c55e" strokeWidth={2} fill="url(#greenGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Status Breakdown */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Orders Breakdown</h3>
          {loading ? <Skeleton className="h-40 w-full" /> : (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={statusData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="status" stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 11 }} />
                <YAxis stroke="#52525b" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                <Tooltip contentStyle={{ background: '#111111', border: '1px solid #2a2a2a', borderRadius: 8 }} labelStyle={{ color: '#a1a1aa' }} itemStyle={{ color: '#22c55e' }} />
                <Bar dataKey="count" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Items */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">{t('analytics.topItems')}</h3>
          {loading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : topItems.length === 0 ? (
            <p className="text-[#52525b] text-sm">No data yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[#52525b] text-left">
                  <th className="pb-2 font-medium">Item</th>
                  <th className="pb-2 font-medium text-right">{t('analytics.orders')}</th>
                  <th className="pb-2 font-medium text-right">{t('analytics.revenue')}</th>
                  <th className="pb-2 font-medium text-center">Type</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((item, i) => (
                  <tr key={item.name} className={i % 2 === 0 ? 'bg-[#0a0a0a]' : ''}>
                    <td className="py-2.5 px-2 text-white rounded-l-lg">{item.name}</td>
                    <td className="py-2.5 px-2 text-[#a1a1aa] text-right">{item.count}</td>
                    <td className="py-2.5 px-2 text-[#22c55e] text-right">{formatCurrency(item.revenue, currency)}</td>
                    <td className="py-2.5 px-2 text-center rounded-r-lg">
                      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${item.isVeg ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
