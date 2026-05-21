import { NavLink, useNavigate } from 'react-router-dom';
import {
  QrCode, LayoutDashboard, UtensilsCrossed, ClipboardList,
  Grid3x3 as Grid3X3, Star, BarChart2, Crown, Settings, LogOut, Bell
} from 'lucide-react';
import { clsx } from 'clsx';
import { signOut } from '../../firebase/auth';
import toast from 'react-hot-toast';
import { useOrders } from '../../hooks/useOrders';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

export function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { restaurantId, isDemo } = useAuthContext();
  const { orders } = useOrders(restaurantId);
  const { requests } = useWaterRequests(restaurantId);
  const { t } = useI18n();
  const today = new Date().setHours(0, 0, 0, 0);
  const pendingCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return o.status === 'pending' && ts >= today;
  }).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  const navItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/admin/menu', icon: UtensilsCrossed, label: t('nav.menu') },
    { to: '/admin/requests', icon: Bell, label: 'Requests', count: pendingRequestsCount },
    { to: '/admin/orders', icon: ClipboardList, label: t('nav.orders'), count: pendingCount },
    { to: '/admin/tables', icon: Grid3X3, label: t('nav.tables') },
    { to: '/admin/ratings', icon: Star, label: t('nav.ratings') },
    { to: '/admin/analytics', icon: BarChart2, label: t('nav.analytics') },
    { to: '/admin/subscription', icon: Crown, label: t('nav.subscription') },
    { to: '/admin/settings', icon: Settings, label: t('nav.settings') },
  ];

  async function handleSignOut() {
    if (isDemo) {
      toast('Demo mode — no sign out needed');
      return;
    }
    await signOut();
    toast.success(t('generic.signedOut'));
    onClose();
    navigate('/login');
  }

  return (
    <aside className={`fixed left-0 top-0 h-screen w-64 bg-[#111111] border-r border-[#2a2a2a] flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center gap-3 p-5 border-b border-[#2a2a2a]">
        <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0 shadow-sm">
          <QrCode className="w-5 h-5 text-white" />
        </div>
        <span className="text-white font-semibold text-lg">ScanMenu</span>
        {isDemo && (
          <span className="ml-auto text-[10px] bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)] px-2 py-0.5 rounded-full font-medium">
            DEMO
          </span>
        )}
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, count }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm transition-all duration-150 relative',
                isActive
                  ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-l-2 border-[#22c55e] pl-[14px]'
                  : 'text-[#a1a1aa] hover:bg-[#1a1a1a] hover:text-white'
              )
            }
          >
            <Icon className="w-[18px] h-[18px] shrink-0" />
            <span>{label}</span>
            {count !== undefined && count > 0 && (
              <span className="ml-auto w-5 h-5 bg-[#ef4444] text-white text-[10px] rounded-full flex items-center justify-center animate-pulse">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-[#2a2a2a]">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-4 py-2.5 w-full rounded-lg text-sm text-[#a1a1aa] hover:text-[#ef4444] hover:bg-[#1a1a1a] transition-all duration-150"
        >
          <LogOut className="w-[18px] h-[18px]" />
          {t('nav.signOut')}
        </button>
      </div>
    </aside>
  );
}
