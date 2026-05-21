import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { signIn } from '../firebase/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await signIn(email, password);
      toast.success('Welcome back!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in';
      toast.error(msg.includes('wrong-password') || msg.includes('invalid-credential') ? 'Invalid email or password' : msg);
    } finally {
      setLoading(false);
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
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
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
