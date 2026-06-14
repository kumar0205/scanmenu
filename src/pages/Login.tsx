import { useState, useEffect, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { signIn, resetPassword, signOut } from '../firebase/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useAuthContext } from '../context/AuthContext';

export default function Login() {
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !user.isAnonymous) {
      if (userRole === 'owner') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [user, userRole, authLoading, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    try {
      const user = await signIn(cleanEmail, cleanPassword);

      const userDocRef = doc(db, 'users', user.user.uid);
      const userDoc = await getDoc(userDocRef);
      const role = userDoc.exists() ? userDoc.data().role : null;

      if (role === 'superAdmin' || cleanEmail === 'cjvkumarraja@gmail.com') {
        await signOut();
        toast.error('Super Admins must sign in through the Super Admin portal.');
        setLoading(false);
        return;
      }

      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      toast.error(msg.includes('wrong-password') || msg.includes('invalid-credential') ? 'Invalid email or password' : msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      toast.error('Please enter your email address first');
      return;
    }
    setResetting(true);
    try {
      await resetPassword(email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(msg);
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111111] border border-[#2a2a2a] rounded-xl p-10 animate-in">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-[#22c55e] rounded-xl flex items-center justify-center mb-4">
            <QrCode className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-white text-2xl font-semibold">Welcome back</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Sign in to your dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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

        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#22c55e] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
