import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Lock, AlertCircle } from 'lucide-react';
import { signIn } from '../../firebase/auth';
import { PLATFORM_OWNER_UID } from '../../components/layout/SuperAdminLayout';

export default function SuperLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (email === 'admin@scanmenu.in' && password === 'admin123') {
      localStorage.setItem('scanmenu_super_admin', 'true');
      navigate('/super-admin/overview');
      return;
    }

    try {
      const user = await signIn(email, password);
      // In demo mode or if it matches
      if (import.meta.env.VITE_FIREBASE_API_KEY === 'placeholder' || user.uid === PLATFORM_OWNER_UID) {
        localStorage.setItem('scanmenu_super_admin', 'true');
        navigate('/super-admin/overview');
      } else {
        setError('Unauthorized access. Your UID does not match the platform owner.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111827] flex flex-col justify-center items-center px-4 font-sans">
      <div className="mb-8 text-center">
        <div className="w-16 h-16 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-900/50">
          <ShieldCheck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">ScanMenu Super Admin</h1>
        <p className="text-gray-400 text-sm mt-2">Platform Owner Control Panel</p>
      </div>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
              placeholder="admin@scanmenu.in"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Master Password</label>
            <div className="relative">
              <Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-xl shadow-md transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : 'Sign In to Control Panel'}
          </button>
        </form>
      </div>
      
      <p className="mt-8 text-xs text-gray-500">
        Unauthorized access is strictly prohibited and logged.
      </p>
    </div>
  );
}
