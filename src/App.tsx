import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';
import { RoleGuard } from './components/layout/RoleGuard';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const NotFound = lazy(() => import('./pages/NotFound'));

const Dashboard = lazy(() => import('./pages/admin/Dashboard'));
const Menu = lazy(() => import('./pages/admin/Menu'));
const Orders = lazy(() => import('./pages/admin/Orders'));
const Requests = lazy(() => import('./pages/admin/Requests'));
const Tables = lazy(() => import('./pages/admin/Tables'));
const Ratings = lazy(() => import('./pages/admin/Ratings'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const Subscription = lazy(() => import('./pages/admin/Subscription'));
const Settings = lazy(() => import('./pages/admin/Settings'));
const KitchenKDS = lazy(() => import('./pages/admin/KitchenKDS'));
const RiderApp = lazy(() => import('./delivery/pages/RiderApp'));
const Riders = lazy(() => import('./pages/admin/Riders'));

const SuperLogin = lazy(() => import('./pages/super-admin/SuperLogin'));
const SuperRestaurants = lazy(() => import('./pages/super-admin/Restaurants'));
const SuperOverview = lazy(() => import('./pages/super-admin/Overview'));
const SuperOwners = lazy(() => import('./pages/super-admin/Owners'));
const SuperOrders = lazy(() => import('./pages/super-admin/Orders'));
const SuperRiders = lazy(() => import('./pages/super-admin/Riders'));
const SuperRevenue = lazy(() => import('./pages/super-admin/Revenue'));
const SuperSettings = lazy(() => import('./pages/super-admin/PlatformSettings'));

const MenuPage = lazy(() => import('./pages/customer/MenuPage'));
const RatingPage = lazy(() => import('./pages/customer/RatingPage'));
const PayPage = lazy(() => import('./pages/customer/PayPage'));
const OrderSuccessPage = lazy(() => import('./pages/customer/OrderSuccessPage'));

const GlobalLoader = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-warm-50/50 backdrop-blur-sm">
    <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const isNative = Capacitor.isNativePlatform();

function RootRouteHandler() {
  if (isNative) {
    return <Navigate to="/admin" replace />;
  }

  const host = window.location.hostname;
  const isPlatformHost = 
    host === 'localhost' || 
    host === '127.0.0.1' || 
    host === 'scanmenu.store' || 
    host.endsWith('.scanmenu.store') || 
    host.endsWith('vercel.app');

  if (!isPlatformHost) {
    return <MenuPage />;
  }

  return <Landing />;
}

export default function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <I18nProvider>
          <Suspense fallback={<GlobalLoader />}>
            <Routes>
              <Route path="/" element={<RootRouteHandler />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />

                {/* Owner + SuperAdmin only */}
                <Route element={<RoleGuard allowedRoles={['owner', 'superAdmin']} />}>
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="menu" element={<Menu />} />
                  <Route path="tables" element={<Tables />} />
                  <Route path="riders" element={<Riders />} />
                  <Route path="ratings" element={<Ratings />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="subscription" element={<Subscription />} />
                  <Route path="settings" element={<Settings />} />
                </Route>

                {/* Owner + Waiter */}
                <Route element={<RoleGuard allowedRoles={['owner', 'superAdmin', 'waiter']} />}>
                  <Route path="orders" element={<Orders />} />
                  <Route path="requests" element={<Requests />} />
                </Route>

                {/* Owner + Chef + Waiter */}
                <Route element={<RoleGuard allowedRoles={['owner', 'superAdmin', 'chef', 'waiter']} />}>
                  <Route path="kitchen" element={<KitchenKDS />} />
                </Route>

                {/* Rider only */}
                <Route element={<RoleGuard allowedRoles={['owner', 'superAdmin', 'rider']} />}>
                  <Route path="rider/*" element={<RiderApp />} />
                </Route>
              </Route>

              {/* SUPER ADMIN ROUTES */}
              <Route path="/super-admin/login" element={<SuperLogin />} />
              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<Navigate to="/super-admin/overview" replace />} />
                <Route path="overview" element={<SuperOverview />} />
                <Route path="restaurants" element={<SuperRestaurants />} />
                <Route path="owners" element={<SuperOwners />} />
                <Route path="orders" element={<SuperOrders />} />
                <Route path="riders" element={<SuperRiders />} />
                <Route path="revenue" element={<SuperRevenue />} />
                <Route path="settings" element={<SuperSettings />} />
              </Route>

              {isNative ? (
                <>
                  <Route path="/pay/:sessionId" element={<Navigate to="/admin" replace />} />
                  <Route path="/:restaurantSlug" element={<Navigate to="/admin" replace />} />
                  <Route path="/:restaurantSlug/success/:orderId" element={<Navigate to="/admin" replace />} />
                  <Route path="/:restaurantSlug/rate/:orderId" element={<Navigate to="/admin" replace />} />
                </>
              ) : (
                <>
                  <Route path="/pay/:sessionId" element={<PayPage />} />
                  <Route path="/:restaurantSlug" element={<MenuPage />} />
                  <Route path="/:restaurantSlug/success/:orderId" element={<OrderSuccessPage />} />
                  <Route path="/:restaurantSlug/rate/:orderId" element={<RatingPage />} />
                </>
              )}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>

          <Toaster
            position="top-right"
            toastOptions={{
              style: { background: '#1E293B', color: '#F8FAFC', border: '1px solid #334155', borderRadius: '12px', fontSize: '14px' },
              success: { iconTheme: { primary: '#22C55E', secondary: '#1E293B' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#1E293B' } },
            }}
          />
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
