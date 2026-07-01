import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Menu, QrCode } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useAuthContext } from '../../context/AuthContext';
import { clsx } from 'clsx';

export function AdminLayout() {
  const { user, userRole, loading, isDemo } = useAuthContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-premium-bg flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-premium-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // In demo mode, always allow access
  const ALLOWED_ROLES = ['owner', 'superAdmin', 'chef', 'waiter', 'rider'];
  if (!isDemo && (!user || user.isAnonymous || !ALLOWED_ROLES.includes(userRole ?? ''))) return <Navigate to="/login" replace />;

  if (userRole === 'rider') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-premium-bg flex flex-col lg:flex-row text-slate-900 dark:text-premium-text transition-colors duration-200">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-white dark:bg-premium-sidebar border-b border-slate-200 dark:border-premium-border sticky top-0 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-slate-950 dark:text-premium-text bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-premium-primary rounded-lg flex items-center justify-center shrink-0 shadow-premium">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-slate-950 dark:text-premium-text font-bold text-base">ScanMenu</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <AdminSidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />
      
      {/* Main Content Area */}
      <main className={clsx(
        "flex-1 min-h-screen overflow-y-auto transition-all duration-300",
        isCollapsed ? "lg:ml-20" : "lg:ml-64"
      )}>
        <Outlet />
      </main>
    </div>
  );
}
