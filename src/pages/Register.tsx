import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode } from 'lucide-react';
import toast from 'react-hot-toast';
import { registerRestaurant } from '../firebase/auth';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    restaurantName: '',
    email: '',
    password: '',
    phone: '',
    address: '',
  });
  const [loading, setLoading] = useState(false);

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await registerRestaurant(form);
      toast.success('Restaurant created!');
      navigate('/admin/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      toast.error(msg.includes('email-already-in-use') ? 'Email already in use' : msg);
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
          <h1 className="text-white text-2xl font-semibold">Create your account</h1>
          <p className="text-[#a1a1aa] text-sm mt-1">Start your free trial today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Restaurant Name"
            placeholder="Sharma Dhaba"
            value={form.restaurantName}
            onChange={set('restaurantName')}
            required
          />
          <Input
            label="Email"
            type="email"
            placeholder="you@restaurant.com"
            value={form.email}
            onChange={set('email')}
            required
          />
          <Input
            label="Password"
            type="password"
            placeholder="Min. 6 characters"
            value={form.password}
            onChange={set('password')}
            required
            minLength={6}
          />
          <Input
            label="WhatsApp Number"
            placeholder="919876543210"
            value={form.phone}
            onChange={set('phone')}
            prefix={<span className="text-xs">+</span>}
            required
          />
          <Input
            label="Address"
            placeholder="123 Main St, City"
            value={form.address}
            onChange={set('address')}
          />
          <Button type="submit" fullWidth loading={loading} size="lg" className="mt-2">
            Create Account
          </Button>
        </form>

        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#22c55e] hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
