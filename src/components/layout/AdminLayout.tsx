import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Menu, QrCode } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { useAuthContext } from '../../context/AuthContext';

export function AdminLayout() {
  const { user, userRole, loading, isDemo } = useAuthContext();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // In demo mode, always allow access
  if (!isDemo && (!user || user.isAnonymous || (userRole !== 'owner' && userRole !== 'superAdmin'))) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-[#111111] border-b border-[#2a2a2a] sticky top-0 z-30">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="w-10 h-10 flex items-center justify-center text-white bg-[#1a1a1a] rounded-lg border border-[#2a2a2a]"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center shrink-0">
            <QrCode className="w-5 h-5 text-white" />
          </div>
          <span className="text-white font-semibold text-base">ScanMenu</span>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <AdminSidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <main className="flex-1 lg:ml-64 min-h-screen overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
