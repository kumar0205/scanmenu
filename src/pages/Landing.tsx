import { Link } from 'react-router-dom';
import { QrCode, ChefHat, CreditCard, BarChart2, ArrowRight, Check, Zap, Smartphone, Sparkles, Star, ScanLine } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuthContext();

  return (
    <div className="min-h-screen bg-stone-950 text-white selection:bg-emerald-500/30 font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden flex justify-center">
        <div className="absolute top-[-10%] w-[800px] h-[600px] bg-emerald-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-amber-500/10 blur-[120px] rounded-full mix-blend-screen" />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-950/70 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
              <QrCode className="w-4 h-4 text-stone-950" />
            </div>
            <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-stone-400">ScanMenu</span>
          </div>
          <Link
            to={user ? '/admin/dashboard' : '/login'}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 backdrop-blur-md border border-white/10 hover:border-white/20"
          >
            Dashboard <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 overflow-hidden">
          <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-8 animate-fade-in-up">
            <Sparkles className="w-3.5 h-3.5" />
            The Future of Dining
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.1] mb-6 tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-stone-200 to-stone-500 max-w-5xl mx-auto">
            Your Restaurant's Menu, <br className="hidden md:block" />
            <span className="text-emerald-400 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-emerald-600">Reimagined</span>
          </h1>
          <p className="text-stone-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            Transform your dining experience with stunning, interactive digital menus. Customers scan, order, and pay seamlessly from their phones.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-[0_0_40px_-10px_rgba(16,185,129,0.5)]"
            >
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold px-8 py-4 rounded-2xl transition-all duration-300 hover:scale-[1.02]"
            >
              View Live Demo
            </Link>
          </div>

          {/* Hero Visual Presentation */}
          <div className="mt-20 relative w-full max-w-5xl mx-auto aspect-[16/9] md:aspect-[21/9] rounded-3xl overflow-hidden border border-white/10 shadow-2xl bg-stone-900/50 backdrop-blur-sm group perspective-1000">
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent z-10" />
            <img src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=2000" alt="Restaurant interior" className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-700" />

            {/* Floating UI Elements */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
              <div className="w-24 h-24 bg-white rounded-3xl p-3 shadow-2xl mb-6 transform rotate-[-5deg] hover:rotate-0 transition-transform duration-500 border-4 border-stone-100">
                <QrCode className="w-full h-full text-stone-950" />
              </div>
              <div className="bg-stone-950/80 backdrop-blur-md border border-white/10 px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-2 shadow-xl transform translate-y-4">
                <ScanLine className="w-4 h-4 text-emerald-400" /> Scan to order
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">Everything you need to <span className="text-emerald-400">succeed</span></h2>
              <p className="text-stone-400 text-lg max-w-2xl mx-auto">A powerful, all-in-one platform designed to elevate your restaurant's efficiency and customer experience.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[280px]">
              {/* Card 1: Wide */}
              <div className="md:col-span-2 bg-gradient-to-br from-stone-900 to-stone-950 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/20 transition-colors" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center mb-6 border border-emerald-500/20">
                      <Smartphone className="w-6 h-6 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Beautiful Digital Menus</h3>
                    <p className="text-stone-400 max-w-md leading-relaxed">Impress your guests with stunning, photo-rich menus that load instantly on any device. No app downloads required.</p>
                  </div>
                </div>
              </div>

              {/* Card 2: Square */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-amber-500/30 transition-colors">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-6 border border-amber-500/20">
                      <Zap className="w-6 h-6 text-amber-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Instant Ordering</h3>
                    <p className="text-stone-400 leading-relaxed">Orders flow directly to your kitchen in milliseconds, reducing wait times and errors.</p>
                  </div>
                </div>
              </div>

              {/* Card 3: Square */}
              <div className="bg-gradient-to-br from-stone-900 to-stone-950 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 border border-blue-500/20">
                      <CreditCard className="w-6 h-6 text-blue-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Seamless Payments</h3>
                    <p className="text-stone-400 leading-relaxed">Accept UPI, cards, and wallets effortlessly right from the customer's phone.</p>
                  </div>
                </div>
              </div>

              {/* Card 4: Wide */}
              <div className="md:col-span-2 bg-gradient-to-br from-stone-900 to-stone-950 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2 group-hover:bg-purple-500/20 transition-colors" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 border border-purple-500/20">
                      <BarChart2 className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">Actionable Insights</h3>
                    <p className="text-stone-400 max-w-md leading-relaxed">Track your best-selling items, peak hours, and customer ratings in a powerful, intuitive dashboard.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it Works / Timeline */}
        <section className="py-32 px-6 bg-stone-900/30 border-y border-white/5 relative overflow-hidden">
          <div className="max-w-5xl mx-auto relative z-10">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">How it works</h2>
              <p className="text-stone-400 text-lg">Three simple steps to revolutionize your service.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative">
              {/* Connecting Line (Desktop) */}
              <div className="hidden md:block absolute top-12 left-24 right-24 h-0.5 bg-gradient-to-r from-stone-800 via-emerald-500/30 to-stone-800" />

              {[
                { step: '01', title: 'Create Menu', desc: 'Upload your dishes, photos, and prices in our easy-to-use admin dashboard.', icon: ChefHat },
                { step: '02', title: 'Place QR Codes', desc: 'Print beautifully designed QR codes and place them on your tables.', icon: QrCode },
                { step: '03', title: 'Serve & Profit', desc: 'Receive orders instantly and turn tables faster with frictionless payments.', icon: Star },
              ].map((item) => (
                <div key={item.step} className="relative flex flex-col items-center text-center group">
                  <div className="w-24 h-24 rounded-full bg-stone-950 border border-white/10 flex items-center justify-center z-10 mb-8 group-hover:border-emerald-500/50 group-hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)] transition-all duration-300">
                    <item.icon className="w-10 h-10 text-stone-300 group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <span className="text-emerald-500 font-bold tracking-widest text-sm mb-3">STEP {item.step}</span>
                  <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                  <p className="text-stone-400 leading-relaxed max-w-[280px]">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="py-32 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-20">
              <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
                🎉 Limited Time Offer
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 tracking-tight">100% Free. Forever.</h2>
              <p className="text-stone-400 text-lg max-w-2xl mx-auto">We're making our premium tools accessible to every restaurant. No hidden fees, no credit card required.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  name: 'Starter', price: '₹0', sub: 'forever', highlight: false,
                  features: ['1 restaurant location', 'Up to 50 menu items', 'Unlimited tables', 'Standard QR codes', 'WhatsApp ordering'],
                },
                {
                  name: 'Pro', price: '₹0', sub: 'forever', highlight: true,
                  features: ['Everything in Starter', 'Unlimited menu items', 'Real-time order dashboard', 'Customer ratings & feedback', 'Basic analytics'],
                },
                {
                  name: 'Business', price: '₹0', sub: 'forever', highlight: false,
                  features: ['Everything in Pro', 'Multiple branches', 'Staff accounts', 'Advanced analytics & export', 'Google Business integration'],
                },
              ].map(({ name, price, sub, highlight, features }) => (
                <div key={name} className={`relative bg-stone-900/50 backdrop-blur-md rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-2 ${highlight ? 'border-2 border-emerald-500 shadow-[0_0_40px_-15px_rgba(16,185,129,0.3)]' : 'border border-white/5'}`}>
                  {highlight && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-stone-950 text-xs font-bold uppercase tracking-wider px-4 py-1.5 rounded-full shadow-lg">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-white font-bold text-2xl mb-2">{name}</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-5xl font-black text-white">{price}</span>
                    <span className="text-stone-400 font-medium">/{sub}</span>
                  </div>
                  <Link
                    to="/register"
                    className={`block w-full text-center py-4 rounded-xl font-bold transition-colors duration-300 mb-8 ${highlight
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-stone-950'
                        : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                  >
                    Get Started Free
                  </Link>
                  <ul className="space-y-4">
                    {features.map(f => (
                      <li key={f} className="flex items-start gap-3 text-sm text-stone-300 font-medium">
                        <Check className="w-5 h-5 text-emerald-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-gradient-to-br from-emerald-900 to-stone-900 border border-emerald-500/20 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay" />
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tight">Ready to transform your restaurant?</h2>
              <p className="text-emerald-100/80 text-lg mb-10 max-w-2xl mx-auto font-medium">Join hundreds of modern restaurants already delivering exceptional digital dining experiences.</p>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 bg-white text-emerald-950 hover:bg-stone-100 font-bold px-10 py-5 rounded-2xl transition-all duration-300 hover:scale-[1.02] shadow-2xl"
              >
                Create Your Menu Now <ArrowRight className="w-5 h-5" />
              </Link>
              <p className="text-emerald-200/50 text-sm mt-6 font-medium">Setup takes less than 5 minutes. No credit card required.</p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 px-6 bg-stone-950">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5 opacity-80 hover:opacity-100 transition-opacity">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-stone-950" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white">ScanMenu</span>
            </div>
            <div className="flex gap-8 text-sm font-medium text-stone-400">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-stone-500 text-sm font-medium">© {new Date().getFullYear()} ScanMenu. All rights reserved.</p>
          </div>
        </footer>
      </main>
    </div>
  );
}
