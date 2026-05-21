import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, DollarSign, UtensilsCrossed, Grid3x3 as Grid3X3, ArrowRight, QrCode, Link2, ExternalLink } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { Badge, statusBadge } from '../../components/ui/Badge';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { useOrders } from '../../hooks/useOrders';
import { useMenu } from '../../hooks/useMenu';
import { subscribeToTables } from '../../firebase/db';
import { mockTables } from '../../lib/mockData';
import { formatCurrency, formatTimeAgo, getGreeting } from '../../utils/formatters';
import type { Table } from '../../types';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { restaurant, restaurantId, isDemo } = useAuthContext();
  const { t } = useI18n();
  const { orders, loading: ordersLoading } = useOrders(restaurantId);
  const { items, loading: menuLoading } = useMenu(restaurantId);
  const [tables, setTables] = useState<Table[]>([]);

  useEffect(() => {
    if (!restaurantId) return;
    if (isDemo) { setTables(mockTables); return; }
    return subscribeToTables(restaurantId, setTables);
  }, [restaurantId, isDemo]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayOrders = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return ts >= today.getTime() && o.status !== 'cancelled';
  });
  const todayRevenue = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return ts >= today.getTime() && o.status === 'completed';
  }).reduce((s, o) => s + o.totalAmount, 0);
  const activeTables = tables.filter(table => table.status !== 'inactive').length;
  const recentOrders = orders.slice(0, 5);
  const currency = restaurant?.currency ?? '₹';
  const menuUrl = `${window.location.origin}/${restaurant?.slug}`;

  function copyLink() {
    navigator.clipboard.writeText(menuUrl);
    toast.success(t('generic.copied'));
  }

  const stats = [
    { icon: ClipboardList, label: t('dashboard.todayOrders'), value: todayOrders.length, loading: ordersLoading },
    { icon: DollarSign, label: t('dashboard.todayRevenue'), value: formatCurrency(todayRevenue, currency), loading: ordersLoading },
    { icon: UtensilsCrossed, label: t('dashboard.menuItems'), value: items.length, loading: menuLoading },
    { icon: Grid3X3, label: t('dashboard.activeTables'), value: activeTables, loading: false },
  ];

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.dashboard')} />
      <div className="p-6 space-y-6">
        {/* Greeting */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-white text-2xl font-semibold">
              {getGreeting()}, {restaurant?.name ?? ''}!
            </h2>
            <p className="text-[#a1a1aa] text-sm mt-1">{t('dashboard.greeting')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 border border-[#2a2a2a] text-[#a1a1aa] hover:text-white hover:border-[#3a3a3a] text-sm px-3 py-2 rounded-lg transition-all duration-150"
            >
              <Link2 className="w-4 h-4" /> {t('dashboard.copyLink')}
            </button>
            <a
              href={menuUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150"
            >
              {t('dashboard.viewMenu')} <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map(({ icon: Icon, label, value, loading }) => (
            <div key={label} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg bg-[rgba(34,197,94,0.15)] flex items-center justify-center mb-3">
                <Icon className="w-5 h-5 text-[#22c55e]" />
              </div>
              {loading ? (
                <Skeleton className="h-8 w-16 mb-1" />
              ) : (
                <p className="text-white text-2xl font-semibold">{value}</p>
              )}
              <p className="text-[#a1a1aa] text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Table overview */}
          <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">{t('dashboard.tableOverview')}</h3>
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
              {tables.map(table => (
                <div
                  key={table.id}
                  className={`w-full aspect-square rounded-xl border flex flex-col items-center justify-center transition-colors duration-150 ${
                    table.status === 'available' ? 'border-[#22c55e] bg-[rgba(34,197,94,0.1)] text-[#22c55e]' :
                    table.status === 'occupied' ? 'border-[#f59e0b] bg-[rgba(245,158,11,0.1)] text-[#f59e0b]' :
                    'border-[#2a2a2a] bg-[#111111] text-[#52525b]'
                  }`}
                >
                  <span className="font-bold text-sm">{table.number}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-4">
              {[
                { color: '#22c55e', label: t('dashboard.available') },
                { color: '#f59e0b', label: t('dashboard.occupied') },
                { color: '#52525b', label: t('dashboard.inactive') },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-[#a1a1aa] text-xs">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div className="space-y-3">
            <h3 className="text-white font-semibold">{t('dashboard.quickActions')}</h3>
            {[
              { icon: UtensilsCrossed, title: t('dashboard.manageMenu'), desc: t('dashboard.manageMenuDesc'), to: '/admin/menu' },
              { icon: ClipboardList, title: t('dashboard.viewOrders'), desc: t('dashboard.viewOrdersDesc'), to: '/admin/orders' },
              { icon: QrCode, title: t('dashboard.qrCodes'), desc: t('dashboard.qrCodesDesc'), to: '/admin/tables' },
            ].map(({ icon: Icon, title, desc, to }) => (
              <Link
                key={to}
                to={to}
                className="flex items-start gap-3 bg-[#111111] border border-[#2a2a2a] rounded-xl p-4 hover:border-[#22c55e] transition-all duration-150 group"
              >
                <div className="w-9 h-9 rounded-lg bg-[rgba(34,197,94,0.15)] flex items-center justify-center shrink-0">
                  <Icon className="w-4.5 h-4.5 text-[#22c55e]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium">{title}</p>
                  <p className="text-[#52525b] text-xs mt-0.5">{desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-[#52525b] group-hover:text-[#22c55e] transition-colors shrink-0 mt-0.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">{t('dashboard.recentOrders')}</h3>
            <Link to="/admin/orders" className="text-[#22c55e] text-sm hover:underline">{t('dashboard.viewAll')}</Link>
          </div>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardList className="w-12 h-12 text-[#2a2a2a] mx-auto mb-3" />
              <p className="text-[#52525b] text-sm">{t('dashboard.noOrders')}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentOrders.map(o => (
                <div key={o.id} className="flex items-center gap-4 py-3 border-b border-[#1a1a1a] last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{t('generic.table')} {o.tableNumber}</span>
                      <span className="text-[#52525b] text-xs">·</span>
                      <span className="text-[#a1a1aa] text-xs">{o.customerName}</span>
                    </div>
                    <p className="text-[#52525b] text-xs mt-0.5 truncate">
                      {o.items.map(i => `${i.qty}x ${i.name}`).join(', ')}
                    </p>
                  </div>
                  <Badge variant={statusBadge(o.status)}>{t(`orders.status.${o.status}`)}</Badge>
                  <span className="text-[#a1a1aa] text-xs shrink-0">{formatTimeAgo(o.createdAt)}</span>
                  <span className="text-white text-sm font-medium shrink-0">{formatCurrency(o.totalAmount, currency)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
