import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useRiderData } from '../hooks/useRiderData';
import Home from './Home';
import AvailableOrders from './AvailableOrders';
import MyDeliveries from './MyDeliveries';
import DeliveryDetails from './DeliveryDetails';
import Earnings from './Earnings';
import Profile from './Profile';
import { Home as HomeIcon, ClipboardList, Truck, DollarSign, User, Loader2 } from 'lucide-react';

export default function RiderApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    profile,
    availableOrders,
    myOrders,
    loading
  } = useRiderData();

  const currency = '₹';

  if (loading) {
    return (
      <div className="min-h-screen bg-premium-bg flex items-center justify-center p-6 text-left">
        <div className="space-y-4 w-full max-w-md text-center">
          <Loader2 className="w-10 h-10 animate-spin text-premium-primary mx-auto" />
          <p className="text-xs text-premium-muted">Syncing Rider Profile...</p>
        </div>
      </div>
    );
  }

  // Count active tasks for footer badge
  const activeTasksCount = myOrders.filter(o => o.status === 'ready' || o.status === 'out_for_delivery').length;

  const currentPath = location.pathname;

  const navItems = [
    { path: '/admin/rider', label: 'Home', icon: <HomeIcon className="w-5 h-5" /> },
    { 
      path: '/admin/rider/available', 
      label: 'Available', 
      icon: <ClipboardList className="w-5 h-5" />, 
      badge: profile?.isOnline ? availableOrders.length : 0,
      badgeColor: 'bg-premium-danger text-white'
    },
    { 
      path: '/admin/rider/my-deliveries', 
      label: 'Deliveries', 
      icon: <Truck className="w-5 h-5" />, 
      badge: activeTasksCount,
      badgeColor: 'bg-premium-success text-premium-bg'
    },
    { path: '/admin/rider/earnings', label: 'Earnings', icon: <DollarSign className="w-5 h-5" /> },
    { path: '/admin/rider/profile', label: 'Profile', icon: <User className="w-5 h-5" /> }
  ];

  return (
    <div className="bg-premium-bg min-h-screen text-premium-text pb-24 font-sans flex flex-col items-center select-none">
      <div className="w-full max-w-md p-5 flex-1 flex flex-col justify-start">
        <Routes>
          <Route 
            index 
            element={
              <Home 
                profile={profile} 
                myOrders={myOrders} 
                currency={currency} 
              />
            } 
          />
          <Route 
            path="available" 
            element={
              <AvailableOrders 
                profile={profile} 
                availableOrders={availableOrders} 
                currency={currency} 
              />
            } 
          />
          <Route 
            path="my-deliveries" 
            element={
              <MyDeliveries 
                profile={profile} 
                myOrders={myOrders} 
                currency={currency} 
              />
            } 
          />
          <Route 
            path="delivery/:orderId" 
            element={
              <DeliveryDetails 
                profile={profile} 
                myOrders={myOrders} 
                currency={currency} 
              />
            } 
          />
          <Route 
            path="earnings" 
            element={
              <Earnings 
                profile={profile} 
                myOrders={myOrders} 
                currency={currency} 
              />
            } 
          />
          <Route 
            path="profile" 
            element={
              <Profile 
                profile={profile} 
              />
            } 
          />
        </Routes>
      </div>

      {/* Bottom Mobile-First Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-premium-sidebar/95 border-t border-premium-border/60 px-4 py-2 flex justify-around items-center max-w-md mx-auto backdrop-blur-lg shadow-premium">
        {navItems.map((item, idx) => {
          const isActive = currentPath === item.path || (item.path !== '/admin/rider' && currentPath.startsWith(item.path));
          return (
            <button
              key={idx}
              onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-1.5 py-1.5 px-3 rounded-xl transition duration-200 min-h-[48px] justify-center ${
                isActive ? 'text-premium-primary font-bold' : 'text-premium-muted hover:text-premium-text'
              }`}
            >
              {item.icon}
              <span className="text-[9px] font-bold tracking-wide uppercase select-none">{item.label}</span>
              
              {/* Badge Counter */}
              {!!item.badge && item.badge > 0 ? (
                <span className={`absolute top-0.5 right-1 text-[8px] font-extrabold px-1.5 py-0.5 rounded-full ${item.badgeColor}`}>
                  {item.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
