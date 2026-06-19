import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  QrCode, LayoutDashboard, UtensilsCrossed, ClipboardList,
  Grid3x3 as Grid3X3, Star, Settings, LogOut, Bell, TrendingUp,
  Smartphone, Download, ChefHat
} from 'lucide-react';
import { clsx } from 'clsx';
import { signOut } from '../../firebase/auth';
import toast from 'react-hot-toast';
import { useOrders } from '../../hooks/useOrders';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { usePWA } from '../../hooks/usePWA';

const ALL_NAV_ITEMS: ReadonlyArray<{
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: readonly string[];
  countKey?: string;
}> = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'nav.dashboard',   roles: ['owner', 'superAdmin'] },
  { to: '/admin/menu',      icon: UtensilsCrossed,  label: 'nav.menu',        roles: ['owner', 'superAdmin'] },
  { to: '/admin/requests',  icon: Bell,              label: 'Requests',        roles: ['owner', 'superAdmin', 'waiter'], countKey: 'requests' },
  { to: '/admin/orders',    icon: ClipboardList,     label: 'nav.orders',      roles: ['owner', 'superAdmin', 'waiter'], countKey: 'orders' },
  { to: '/admin/kitchen',   icon: ChefHat,           label: 'Kitchen KDS',     roles: ['owner', 'superAdmin', 'chef', 'waiter'] },
  { to: '/admin/tables',    icon: Grid3X3,           label: 'nav.tables',      roles: ['owner', 'superAdmin'] },
  { to: '/admin/ratings',   icon: Star,              label: 'nav.ratings',     roles: ['owner', 'superAdmin'] },
  { to: '/admin/analytics', icon: TrendingUp,        label: 'nav.analytics',   roles: ['owner', 'superAdmin'] },
  { to: '/admin/settings',  icon: Settings,          label: 'nav.settings',    roles: ['owner', 'superAdmin'] },
];

const ROLE_BADGE: Record<string, { emoji: string; label: string; color: string }> = {
  owner:      { emoji: '👑', label: 'Owner',  color: '#f59e0b' },
  superAdmin: { emoji: '⚡', label: 'Admin',  color: '#a855f7' },
  chef:       { emoji: '👨‍🍳', label: 'Chef',   color: '#22c55e' },
  waiter:     { emoji: '🧑‍🍽️', label: 'Waiter', color: '#3b82f6' },
};

export function AdminSidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const { restaurantId, userRole, isDemo } = useAuthContext();
  const { orders } = useOrders(restaurantId);
  const { requests } = useWaterRequests(restaurantId);
  const { t } = useI18n();
  const { isInstallable, isStandalone, installApp, isIOS } = usePWA();

  const today = new Date().setHours(0, 0, 0, 0);
  const pendingCount = orders.filter(o => {
    const ts = typeof o.createdAt?.toMillis === 'function' ? o.createdAt.toMillis() : Date.now();
    return o.status === 'pending' && ts >= today;
  }).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  // Filter nav items by current role
  const navItems = ALL_NAV_ITEMS
    .filter(item => !userRole || (item.roles as readonly string[]).includes(userRole))
    .map(item => ({
      to: item.to,
      icon: item.icon,
      label: t(item.label) || item.label,
      count: item.countKey === 'orders'
        ? pendingCount
        : item.countKey === 'requests'
        ? pendingRequestsCount
        : undefined,
    }));

  const roleBadge = userRole ? ROLE_BADGE[userRole] : null;

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
        {!isDemo && roleBadge && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold border"
            style={{
              color: roleBadge.color,
              background: `${roleBadge.color}18`,
              borderColor: `${roleBadge.color}40`,
            }}
          >
            {roleBadge.emoji} {roleBadge.label}
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

      {/* PWA Install Widget — only for owner */}
      {(userRole === 'owner' || userRole === 'superAdmin') && !isStandalone && (isInstallable || isIOS) && (
        <div className="m-3 p-3 bg-[#161616] border border-[#2a2a2a] rounded-xl flex flex-col gap-2">
          <div className="flex gap-2 items-start">
            <div className="p-1.5 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] rounded-lg shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-white text-xs font-semibold">Install ScanMenu</p>
              <p className="text-[#52525b] text-[10px] leading-tight mt-0.5">Add to home screen for order alerts & fast access.</p>
            </div>
          </div>
          {isInstallable ? (
            <button
              onClick={() => {
                installApp().then(success => {
                  if (success) toast.success("App installed!");
                });
              }}
              className="w-full bg-[#22c55e] hover:bg-green-600 text-black font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all"
            >
              <Download className="w-3 h-3" /> Download App
            </button>
          ) : (
            <p className="text-[9px] text-[#a1a1aa] leading-tight">
              iOS Safari: Tap <span className="font-semibold text-white">Share</span>, then <span className="font-semibold text-white">Add to Home Screen</span>.
            </p>
          )}
        </div>
      )}

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
