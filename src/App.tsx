import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Suspense, lazy } from 'react';
import { Capacitor } from '@capacitor/core';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './context/I18nContext';
import { AdminLayout } from './components/layout/AdminLayout';
import { SuperAdminLayout } from './components/layout/SuperAdminLayout';

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

const SuperLogin = lazy(() => import('./pages/super-admin/SuperLogin'));
const SuperRestaurants = lazy(() => import('./pages/super-admin/Restaurants'));

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

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <I18nProvider>
          <Suspense fallback={<GlobalLoader />}>
            <Routes>
              <Route path="/" element={isNative ? <Navigate to="/admin" replace /> : <Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="menu" element={<Menu />} />
                <Route path="orders" element={<Orders />} />
                <Route path="requests" element={<Requests />} />
                <Route path="tables" element={<Tables />} />
                <Route path="ratings" element={<Ratings />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="subscription" element={<Subscription />} />
                <Route path="settings" element={<Settings />} />
              </Route>

              {/* SUPER ADMIN ROUTES */}
              <Route path="/super-admin/login" element={<SuperLogin />} />
              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<Navigate to="/super-admin/restaurants" replace />} />
                <Route path="restaurants" element={<SuperRestaurants />} />
                <Route path="billing" element={<Navigate to="/super-admin/restaurants" replace />} />
                <Route path="analytics" element={<Navigate to="/super-admin/restaurants" replace />} />
                <Route path="users" element={<Navigate to="/super-admin/restaurants" replace />} />
                <Route path="notifications" element={<Navigate to="/super-admin/restaurants" replace />} />
                <Route path="settings" element={<Navigate to="/super-admin/restaurants" replace />} />
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
              style: { background: '#111111', color: '#ffffff', border: '1px solid #2a2a2a', borderRadius: '10px', fontSize: '14px' },
              success: { iconTheme: { primary: '#22c55e', secondary: '#fff' } },
              error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
            }}
          />
        </I18nProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
