import { Outlet, NavLink, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  Store, Bell, LogOut, Search, UserCircle, Menu as MenuIcon, X
} from 'lucide-react';
import { clsx } from 'clsx';
import { signOut } from '../../firebase/auth';
import { useAuthContext } from '../../context/AuthContext';
import { useEffect, useState } from 'react';

export function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, loading } = useAuthContext();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user || userRole !== 'superAdmin') {
        navigate('/super-admin/login', { replace: true });
      }
    }
  }, [user, userRole, loading, navigate]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/super-admin/login');
  };

  const navItems = [
    { to: '/super-admin/restaurants', icon: Store, label: 'All Restaurants' },
  ];

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (!user || userRole !== 'superAdmin') {
    return <Navigate to="/super-admin/login" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex font-sans">
      {/* MOBILE OVERLAY */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden" 
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-50 w-[260px] bg-[#111827] text-gray-300 flex flex-col transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 shrink-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                <Store className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-white tracking-tight">ScanMenu</h1>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Platform Owner</p>
              <p className="text-xs text-gray-400">Super Admin Dashboard</p>
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-gray-400 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#F9FAFB] w-full">
        {/* HEADER */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden text-gray-500 hover:text-gray-700"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <h2 className="text-xl font-semibold text-gray-800 capitalize truncate max-w-[150px] sm:max-w-xs">
              {location.pathname.split('/').pop()?.replace('-', ' ')}
            </h2>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            <div className="relative hidden lg:block">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search restaurants, owners..." 
                className="pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm w-64 focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
              />
            </div>
            
            <button className="relative text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-2 md:border-l md:pl-6 border-gray-200">
              <UserCircle className="w-8 h-8 text-gray-400" />
              <div className="hidden sm:block text-sm">
                <p className="font-medium text-gray-700">Admin</p>
                <p className="text-xs text-gray-500">Owner</p>
              </div>
            </div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
