import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, ClipboardList, UtensilsCrossed, ChefHat, 
  Grid3X3, Bike, Star, TrendingUp, Settings, LogOut, QrCode, 
  ChevronLeft, ChevronRight, Bell, Smartphone, Download
} from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useOrders } from '../../hooks/useOrders';
import { useWaterRequests } from '../../hooks/useWaterRequests';
import { useI18n } from '../../context/I18nContext';
import { usePWA } from '../../hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

const navItems: ReadonlyArray<{
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles: readonly string[];
  countKey?: string;
}> = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'nav.dashboard',   roles: ['owner', 'superAdmin'] },
  { to: '/admin/orders',    icon: ClipboardList,     label: 'nav.orders',      roles: ['owner', 'superAdmin', 'waiter'], countKey: 'orders' },
  { to: '/admin/menu',      icon: UtensilsCrossed,  label: 'nav.menu',        roles: ['owner', 'superAdmin'] },
  { to: '/admin/requests',  icon: Bell,              label: 'Requests',        roles: ['owner', 'superAdmin', 'waiter'], countKey: 'requests' },
  { to: '/admin/kitchen',   icon: ChefHat,           label: 'Kitchen KDS',     roles: ['owner', 'superAdmin', 'chef', 'waiter'] },
  { to: '/admin/tables',    icon: Grid3X3,           label: 'nav.tables',      roles: ['owner', 'superAdmin'] },
  { to: '/admin/riders',    icon: Bike,              label: 'nav.riders',      roles: ['owner', 'superAdmin'] },
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

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({ isOpen, onClose, isCollapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { restaurantId, userRole, isDemo } = useAuthContext();
  const { orders } = useOrders(restaurantId);
  const { requests } = useWaterRequests(restaurantId);
  const { t } = useI18n();
  const { isInstallable, isStandalone, installApp, isIOS } = usePWA();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const today = new Date().setHours(0, 0, 0, 0);
  const pendingOrdersCount = orders.filter(o => o.status === 'pending' && new Date(o.createdAt?.toMillis ? o.createdAt.toMillis() : Date.now()).getTime() >= today).length;
  const pendingRequestsCount = requests.filter(r => r.status === 'pending').length;

  const counts: Record<string, number> = {
    orders: pendingOrdersCount,
    requests: pendingRequestsCount,
  };

  const allowedItems = navItems.filter(item => item.roles.includes(userRole ?? ''));
  const roleBadge = userRole ? ROLE_BADGE[userRole] : null;

  async function handleSignOut() {
    await signOut(auth);
    toast.success('Logged out successfully');
    navigate('/login');
  }

  return (
    <aside
      className={clsx(
        'fixed left-0 top-0 h-screen bg-white dark:bg-premium-sidebar border-r border-slate-200 dark:border-premium-border flex flex-col z-40 transition-all duration-300 lg:translate-x-0 select-none shadow-sm dark:shadow-none',
        isCollapsed ? 'lg:w-20' : 'lg:w-64',
        isOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
      )}
    >
      <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-premium-border min-h-[64px] relative">
        <div className="w-8 h-8 bg-premium-primary rounded-lg flex items-center justify-center shrink-0 shadow-premium">
          <QrCode className="w-5 h-5 text-white" />
        </div>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-slate-900 dark:text-premium-text font-bold text-lg truncate"
          >
            ScanMenu
          </motion.span>
        )}
        {!isCollapsed && isDemo && (
          <span className="ml-auto text-[10px] bg-premium-warning/15 text-premium-warning border border-premium-warning/30 px-2 py-0.5 rounded-full font-semibold shrink-0">
            DEMO
          </span>
        )}
        {!isCollapsed && !isDemo && roleBadge && (
          <span
            className="ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0"
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

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto select-none scrollbar-none">
        {allowedItems.map(({ to, icon: Icon, label, countKey }) => {
          const count = countKey ? counts[countKey] : undefined;
          return (
            <div
              key={to}
              className="relative"
              onMouseEnter={() => setHoveredItem(to)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <NavLink
                to={to}
                onClick={onClose}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm transition-all duration-150 relative',
                    isActive
                      ? 'bg-premium-primary/10 text-premium-primary border-l-2 border-premium-primary pl-[14px] font-semibold font-bold'
                      : 'text-slate-500 dark:text-premium-muted hover:bg-slate-50 dark:hover:bg-premium-hover hover:text-slate-900 dark:hover:text-premium-text',
                    isCollapsed && 'lg:justify-center lg:px-0 lg:pl-0'
                  )
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" />
                {!isCollapsed && <span className="truncate font-semibold">{t(label) || label}</span>}
                
                {count !== undefined && count > 0 && (
                  isCollapsed ? (
                    <span className="absolute top-2 right-4 w-2.5 h-2.5 bg-premium-danger rounded-full border-2 border-white dark:border-premium-sidebar animate-pulse" />
                  ) : (
                    <span className="ml-auto min-w-[20px] h-5 px-1 bg-premium-danger text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                      {count > 9 ? '9+' : count}
                    </span>
                  )
                )}
              </NavLink>

              <AnimatePresence>
                {isCollapsed && hoveredItem === to && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="hidden lg:block absolute left-20 top-1/2 -translate-y-1/2 bg-white dark:bg-premium-sidebar border border-slate-200 dark:border-premium-border text-slate-900 dark:text-premium-text px-3 py-1.5 rounded-lg text-xs font-semibold shadow-md dark:shadow-premium z-50 whitespace-nowrap select-none"
                  >
                    {t(label) || label}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      {!isCollapsed && (userRole === 'owner' || userRole === 'superAdmin') && !isStandalone && (isInstallable || isIOS) && (
        <div className="m-3 p-4 bg-slate-50 dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl flex flex-col gap-2">
          <div className="flex gap-2 items-start">
            <div className="p-2 bg-premium-success/10 border border-premium-success/20 text-premium-success rounded-xl shrink-0">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <p className="text-slate-900 dark:text-premium-text text-xs font-semibold">Install ScanMenu</p>
              <p className="text-slate-500 dark:text-premium-muted text-[10px] leading-tight mt-0.5">Add to home screen for order alerts & fast access.</p>
            </div>
          </div>
          {isInstallable ? (
            <button
              onClick={() => {
                installApp().then(success => {
                  if (success) toast.success("App installed!");
                });
              }}
              className="w-full bg-premium-success hover:bg-green-600 text-premium-bg font-extrabold text-xs py-2 px-3 rounded-xl flex items-center justify-center gap-1 transition-all"
            >
              <Download className="w-3 h-3" /> Download App
            </button>
          ) : (
            <p className="text-[9px] text-slate-500 dark:text-premium-muted leading-tight font-semibold">
              iOS Safari: Tap <span className="font-semibold text-slate-900 dark:text-premium-text">Share</span>, then <span className="font-semibold text-slate-900 dark:text-premium-text">Add to Home Screen</span>.
            </p>
          )}
        </div>
      )}

      {onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex w-8 h-8 rounded-full border border-slate-200 dark:border-premium-border bg-white dark:bg-premium-sidebar text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text items-center justify-center absolute -right-4 top-16 z-50 shadow-sm dark:shadow-premium hover:bg-slate-50 dark:hover:bg-premium-hover transition-colors"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}

      <div className="p-3 border-t border-slate-200 dark:border-premium-border">
        <button
          onClick={handleSignOut}
          className={clsx(
            'flex items-center gap-2.5 px-4 py-2.5 rounded-lg text-sm text-slate-500 dark:text-premium-muted hover:text-premium-danger hover:bg-premium-danger/10 transition-all duration-150',
            isCollapsed ? 'lg:justify-center lg:px-0 lg:w-full' : 'w-full'
          )}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" />
          {!isCollapsed && <span className="font-semibold">{t('nav.signOut')}</span>}
        </button>
      </div>
    </aside>
  );
}
