import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, ArrowLeft, ChefHat, Crown, UtensilsCrossed } from 'lucide-react';
import toast from 'react-hot-toast';
import { signIn, resetPassword, signOut } from '../firebase/auth';
import { validateAndSignInStaff } from '../firebase/staffAuth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../context/AuthContext';

type RoleView = 'select' | 'owner' | 'chef' | 'waiter';

const ROLE_CARDS = [
  {
    id: 'owner' as const,
    emoji: '👑',
    icon: Crown,
    label: 'Owner',
    description: 'Full dashboard access',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.1)',
    border: 'rgba(245,158,11,0.25)',
  },
  {
    id: 'chef' as const,
    emoji: '👨‍🍳',
    icon: ChefHat,
    label: 'Chef',
    description: 'Kitchen display only',
    color: '#22c55e',
    bg: 'rgba(34,197,94,0.1)',
    border: 'rgba(34,197,94,0.25)',
  },
  {
    id: 'waiter' as const,
    emoji: '🧑‍🍽️',
    icon: UtensilsCrossed,
    label: 'Waiter',
    description: 'Orders & requests',
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.1)',
    border: 'rgba(59,130,246,0.25)',
  },
];

export default function Login() {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuthContext();
  const [view, setView] = useState<RoleView>('select');

  // Owner form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Staff form state
  const [restaurantCode, setRestaurantCode] = useState('');
  const [pin, setPin] = useState('');
  const [staffLoading, setStaffLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.isAnonymous) {
      if (userRole === 'owner' || userRole === 'superAdmin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (userRole === 'chef') {
        navigate('/admin/kitchen', { replace: true });
      } else if (userRole === 'waiter') {
        navigate('/admin/orders', { replace: true });
      }
    }
  }, [user, userRole, authLoading, navigate]);

  async function handleOwnerSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const cred = await signIn(cleanEmail, cleanPassword);
      const userDocRef = doc(db, 'users', cred.user.uid);
      const userDoc = await getDoc(userDocRef);
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (role === 'superAdmin' || cleanEmail === 'cjvkumarraja@gmail.com') {
        await signOut();
        toast.error('Super Admins must sign in through the Super Admin portal.');
        return;
      }
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      toast.error(
        msg.includes('wrong-password') || msg.includes('invalid-credential')
          ? 'Invalid email or password'
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) { toast.error('Please enter your email address first'); return; }
    setResetting(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  }

  async function handleStaffSubmit(e: FormEvent) {
    e.preventDefault();
    const role = view as 'chef' | 'waiter';
    const slug = restaurantCode.trim().toLowerCase();
    const cleanPin = pin.trim();

    if (!slug) { toast.error('Please enter your Restaurant Code'); return; }
    if (!cleanPin) { toast.error('Please enter your PIN'); return; }

    setStaffLoading(true);
    try {
      await validateAndSignInStaff(slug, role, cleanPin);
      toast.success(`Welcome! Signing you in…`);
      // AuthContext will load role from users doc and navigate in the useEffect above
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      if (msg.includes('resource-exhausted')) {
        toast.error(msg);
      } else if (msg.includes('permission-denied') || msg.includes('Invalid PIN')) {
        toast.error('Invalid PIN. Please try again.');
      } else if (msg.includes('not-found')) {
        toast.error(msg.includes('Restaurant') ? 'Restaurant Code not found.' : 'Staff account not set up yet.');
      } else {
        toast.error('Login failed. Please try again.');
      }
    } finally {
      setStaffLoading(false);
    }
  }

  function goBack() {
    setView('select');
    setRestaurantCode('');
    setPin('');
  }

  const selectedCard = ROLE_CARDS.find(c => c.id === view);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#22c55e]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-[#3b82f6]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#22c55e] rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-[#22c55e]/20">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-tight">ScanMenu</h1>
          <p className="text-[#52525b] text-sm mt-1">
            {view === 'select' ? 'Who are you signing in as?' : view === 'owner' ? 'Sign in to your dashboard' : `${selectedCard?.label} Access`}
          </p>
        </div>

        {/* === ROLE SELECTOR === */}
        {view === 'select' && (
          <div
            className="space-y-3 animate-in"
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            {ROLE_CARDS.map(card => (
              <button
                key={card.id}
                id={`role-card-${card.id}`}
                onClick={() => setView(card.id)}
                className="w-full flex items-center gap-4 p-4 rounded-xl border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] text-left group"
                style={{
                  background: card.bg,
                  borderColor: card.border,
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0 transition-transform duration-200 group-hover:scale-110"
                  style={{ background: card.bg, border: `1px solid ${card.border}` }}
                >
                  {card.emoji}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold text-sm">{card.label}</p>
                  <p className="text-[#71717a] text-xs mt-0.5">{card.description}</p>
                </div>
                <svg
                  className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5"
                  style={{ color: card.color }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        )}

        {/* === OWNER FORM === */}
        {view === 'owner' && (
          <div
            className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 animate-in"
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-[#71717a] hover:text-white text-sm mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            <form onSubmit={handleOwnerSubmit} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-sm font-medium text-white">Password</label>
                  <button
                    type="button"
                    onClick={handleResetPassword}
                    disabled={resetting}
                    className="text-xs text-[#22c55e] hover:underline disabled:opacity-50"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
                Sign In
              </Button>
            </form>

            <p className="text-center text-sm text-[#52525b] mt-5">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#22c55e] hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        )}

        {/* === CHEF / WAITER FORM === */}
        {(view === 'chef' || view === 'waiter') && (
          <div
            className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 animate-in"
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <button
              onClick={goBack}
              className="flex items-center gap-1.5 text-[#71717a] hover:text-white text-sm mb-5 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {/* Role header */}
            <div className="flex items-center gap-3 mb-5 pb-4 border-b border-[#2a2a2a]">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{
                  background: selectedCard?.bg,
                  border: `1px solid ${selectedCard?.border}`,
                }}
              >
                {selectedCard?.emoji}
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{selectedCard?.label} Access</p>
                <p className="text-[#52525b] text-xs">{selectedCard?.description}</p>
              </div>
            </div>

            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <Input
                id={`${view}-restaurant-code`}
                label="Restaurant Code"
                type="text"
                placeholder="e.g. aaha001"
                value={restaurantCode}
                onChange={e => setRestaurantCode(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
              <Input
                id={`${view}-pin`}
                label={`${selectedCard?.label} PIN`}
                type="password"
                inputMode="numeric"
                pattern="\d{4,8}"
                placeholder="Enter PIN"
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                required
                maxLength={8}
              />
              <Button
                type="submit"
                fullWidth
                loading={staffLoading}
                size="lg"
                className="mt-2"
                style={{
                  background: selectedCard?.color,
                  color: view === 'chef' ? 'black' : 'white',
                  border: 'none',
                }}
              >
                {view === 'chef' ? 'Enter Kitchen →' : 'Enter Orders →'}
              </Button>
            </form>

            <p className="text-[#52525b] text-xs text-center mt-4 leading-relaxed">
              Contact your restaurant owner if you don't have a PIN.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
