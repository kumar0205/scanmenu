import { ReactNode, useState, useEffect } from 'react';
import { Search, Bell, RefreshCw, Sun, Moon } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import toast from 'react-hot-toast';

interface AdminHeaderProps {
  title: string;
  children?: ReactNode;
}

export function AdminHeader({ title, children }: AdminHeaderProps) {
  const { restaurant, user, globalSelectedDate, setGlobalSelectedDate } = useAuthContext();
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    toast.success(`${nextTheme === 'dark' ? 'Dark' : 'Light'} mode activated!`, { id: 'theme-toast' });
  };

  const handleRefresh = () => {
    toast.success('Dashboard metrics synchronized!', { icon: '🔄' });
  };

  return (
    <header className="sticky top-0 z-30 h-16 border-b border-slate-200 dark:border-premium-border flex items-center justify-between px-8 bg-white/95 dark:bg-premium-sidebar/90 backdrop-blur-md select-none transition-colors duration-200">
      {/* Left section: Breadcrumbs & Date Selector */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-premium-muted whitespace-nowrap">
          <span>Admin</span>
          <span>/</span>
          <span className="text-slate-950 dark:text-premium-text font-bold">{title}</span>
        </div>
        <div className="hidden md:flex items-center ml-3 border-l border-slate-200 dark:border-premium-border pl-3 select-none">
          <input
            type="date"
            value={globalSelectedDate}
            onChange={(e) => {
              if (e.target.value) {
                setGlobalSelectedDate(e.target.value);
              }
            }}
            className="bg-transparent text-slate-700 dark:text-premium-muted text-xs font-semibold focus:outline-none cursor-pointer hover:text-premium-primary"
          />
        </div>
      </div>

      {/* Center section: Search Bar */}
      <div className="relative max-w-xs w-full hidden lg:block mx-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-premium-muted" />
        <input
          type="text"
          placeholder="Global Search... (Ctrl+K)"
          className="w-full h-[36px] bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl pl-9 pr-4 text-xs text-slate-900 dark:text-premium-text placeholder-slate-400 dark:placeholder-premium-muted focus:outline-none focus:border-premium-primary transition"
          readOnly
          onClick={() => toast('Global Search is coming soon!', { icon: '🔍' })}
        />
      </div>

      {/* Right section: Actions, Switcher, Notifications, Profile */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Children Actions (e.g. + Place Order) */}
        <div className="flex items-center gap-2">
          {children}
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 border border-slate-200 dark:border-premium-border rounded-xl hover:bg-slate-50 dark:hover:bg-premium-hover text-slate-500 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text transition"
          aria-label="Toggle Theme"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-premium-warning" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Sync Button */}
        <button
          onClick={handleRefresh}
          className="p-2 border border-slate-200 dark:border-premium-border rounded-xl hover:bg-slate-50 dark:hover:bg-premium-hover text-slate-500 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text transition"
          aria-label="Refresh Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* Notification Icon */}
        <button
          className="p-2 border border-slate-200 dark:border-premium-border rounded-xl hover:bg-slate-50 dark:hover:bg-premium-hover text-slate-500 dark:text-premium-muted hover:text-slate-950 dark:hover:text-premium-text relative transition"
          aria-label="View notifications"
          onClick={() => toast('No unread alerts today', { icon: '🔔' })}
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-premium-primary rounded-full border border-white dark:border-premium-sidebar" />
        </button>

        {/* Restaurant Switcher */}
        {restaurant && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl text-xs font-bold text-slate-800 dark:text-premium-text cursor-pointer hover:bg-slate-100 dark:hover:bg-premium-hover transition">
            <span className="text-base leading-none">🏪</span>
            <span className="hidden sm:inline truncate max-w-[100px]">{restaurant.name}</span>
          </div>
        )}

        {/* Profile Card */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-premium-primary/10 border border-premium-primary/30 flex items-center justify-center text-xs font-bold text-premium-primary select-none">
            {user?.displayName?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'A'}
          </div>
        </div>
      </div>
    </header>
  );
}
