import { Link } from 'react-router-dom';
import { QrCode, ChefHat, CreditCard, BarChart2, ArrowRight, Check } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#2a2a2a]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#22c55e] rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-white">ScanMenu</span>
          </div>
          <Link
            to={user ? '/admin/dashboard' : '/login'}
            className="flex items-center gap-1.5 bg-[#22c55e] hover:bg-[#16a34a] text-white text-sm font-medium px-4 py-2 rounded-full transition-colors duration-150"
          >
            Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center text-center px-6 pt-16">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 40%, rgba(34,197,94,0.06) 0%, transparent 70%)' }}
        />
        <div className="relative max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] text-[#22c55e] text-xs font-medium px-3 py-1.5 rounded-full mb-8 mt-12 md:mt-0">
            <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e] animate-pulse" />
            Trusted by 500+ restaurants
          </div>
          <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] mb-6 tracking-tight">
            QR Ordering<br />
            <span className="text-[#22c55e]">Made Simple</span>
          </h1>
          <p className="text-[#a1a1aa] text-lg md:text-xl max-w-[560px] mx-auto mb-10 leading-relaxed">
            Transform your restaurant with contactless ordering. Customers scan, browse, order, and pay — all from their phone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-150 hover:scale-[1.02]"
            >
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#a1a1aa] hover:text-white font-medium px-7 py-3.5 rounded-xl transition-all duration-150"
            >
              View Demo
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-[#a1a1aa] text-lg">A complete solution for modern restaurants</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { Icon: QrCode, title: 'QR Code Menus', desc: 'Generate unique QR codes for each table. Customers scan and browse instantly.' },
              { Icon: ChefHat, title: 'Real-time Orders', desc: 'Orders appear instantly on your dashboard with status tracking.' },
              { Icon: CreditCard, title: 'Easy Payments', desc: 'Accept card payments online or let customers pay at the counter.' },
              { Icon: BarChart2, title: 'Analytics', desc: 'Track sales, popular items, and trends to optimize your menu.' },
            ].map(({ Icon, title, desc }) => (
              <div key={title} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-6 hover:border-[#3a3a3a] transition-colors duration-150">
                <div className="w-12 h-12 rounded-xl bg-[rgba(34,197,94,0.15)] flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-[#22c55e]" />
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-[#a1a1aa] text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 border-t border-[#2a2a2a]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
            <p className="text-[#a1a1aa] text-lg">Get started in minutes</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { n: '1', title: 'Set Up Your Menu', desc: 'Add your items, photos, and prices in minutes' },
              { n: '2', title: 'Place QR Codes', desc: 'Print and place QR codes on your tables' },
              { n: '3', title: 'Receive Orders', desc: 'Watch orders flow in real-time to your dashboard' },
            ].map(({ n, title, desc }) => (
              <div key={n} className="text-center">
                <div className="w-12 h-12 rounded-full border-2 border-[#22c55e] bg-[rgba(34,197,94,0.1)] flex items-center justify-center text-[#22c55e] font-bold text-lg mx-auto mb-4">
                  {n}
                </div>
                <h3 className="text-white font-semibold mb-2">{title}</h3>
                <p className="text-[#a1a1aa] text-sm">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-24 px-6 border-t border-[#2a2a2a]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Simple Pricing</h2>
            <p className="text-[#a1a1aa] text-lg">Start free, upgrade when you need more</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: 'Free', price: '₹0', sub: 'forever', highlight: false,
                features: ['1 restaurant', 'Up to 15 menu items', '4 tables', 'Basic QR codes', 'WhatsApp ordering'],
              },
              {
                name: 'Pro', price: '₹299', sub: 'per month', highlight: true,
                features: ['Everything in Free', 'Unlimited items & tables', 'Real-time order dashboard', 'Customer ratings', 'Basic analytics', 'Priority support'],
              },
              {
                name: 'Business', price: '₹699', sub: 'per month', highlight: false,
                features: ['Everything in Pro', 'Multiple branches', 'Staff accounts', 'Advanced analytics', 'Google Business integration', 'Customer rewards'],
              },
            ].map(({ name, price, sub, highlight, features }) => (
              <div key={name} className={`relative bg-[#111111] border rounded-xl p-6 ${highlight ? 'border-[#22c55e]' : 'border-[#2a2a2a]'}`}>
                {highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22c55e] text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <h3 className="text-white font-bold text-xl mb-1">{name}</h3>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold text-white">{price}</span>
                  <span className="text-[#a1a1aa] text-sm">/{sub}</span>
                </div>
                <div className="border-t border-[#2a2a2a] my-4" />
                <ul className="space-y-2.5">
                  {features.map(f => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[#a1a1aa]">
                      <Check className="w-4 h-4 text-[#22c55e] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-6 block text-center py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    highlight
                      ? 'bg-[#22c55e] hover:bg-[#16a34a] text-white'
                      : 'border border-[#2a2a2a] hover:border-[#3a3a3a] text-[#a1a1aa] hover:text-white'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 text-center border-t border-[#2a2a2a]">
        <h2 className="text-4xl font-bold text-white mb-4">Ready to modernize your restaurant?</h2>
        <p className="text-[#a1a1aa] mb-8">Join hundreds of restaurants already using ScanMenu</p>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold px-8 py-4 rounded-xl transition-all duration-150 hover:scale-[1.02]"
        >
          Start Free Trial <ArrowRight className="w-4 h-4" />
        </Link>
        <p className="text-[#52525b] text-sm mt-4">No credit card required</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2a2a2a] py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#22c55e] rounded-lg flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">ScanMenu</span>
          </div>
          <p className="text-[#52525b] text-sm">© 2025 ScanMenu. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
