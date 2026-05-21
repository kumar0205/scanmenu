import { useMemo, useState, useEffect } from 'react';
import {
  Star,
  Leaf,
  Flame,
  Sparkles,
  WheatOff,
  Plus,
  Minus,
  ShoppingBag,
  MapPin,
  Clock,
  Phone as PhoneIcon,
  ChevronDown,
} from 'lucide-react';

/* ---------- Data ---------- */

type Tag = 'signature' | 'new' | 'spicy' | 'vegan' | 'gluten-free';

interface Item {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  tags: Tag[];
  popular?: boolean;
}

interface Category {
  id: string;
  name: string;
  items: Item[];
}

const CATEGORIES: Category[] = [
  {
    id: 'starters',
    name: 'Starters',
    items: [
      {
        id: 'i1',
        name: 'Burrata & Heirloom Tomato',
        description:
          'Creamy burrata, sun-ripened heirloom tomatoes, basil oil, flaky sea salt, grilled sourdough.',
        price: 16,
        image: '/images/burrata.jpg',
        tags: ['signature'],
        popular: true,
      },
      {
        id: 'i2',
        name: 'Crispy Calamari',
        description: 'Lightly battered squid, lemon aioli, charred chili, fresh parsley.',
        price: 14,
        image: '/images/calamari.jpg',
        tags: ['spicy'],
      },
    ],
  },
  {
    id: 'mains',
    name: 'Mains',
    items: [
      {
        id: 'i3',
        name: 'Tagliatelle al Ragù',
        description:
          'Hand-cut tagliatelle, 8-hour beef & pork ragù, parmigiano reggiano, fresh parsley.',
        price: 24,
        image: '/images/pasta.jpg',
        tags: ['signature'],
        popular: true,
      },
      {
        id: 'i4',
        name: 'Wild Mushroom Risotto',
        description: 'Arborio rice, porcini & cremini, truffle butter, aged pecorino.',
        price: 22,
        image: '/images/risotto.jpg',
        tags: ['gluten-free'],
      },
      {
        id: 'i5',
        name: 'Spicy Nduja Pizza',
        description:
          'San Marzano tomato, fior di latte, Calabrian nduja, hot honey drizzle, torn basil.',
        price: 21,
        image: '/images/pizza.jpg',
        tags: ['spicy', 'new'],
        popular: true,
      },
    ],
  },
  {
    id: 'desserts',
    name: 'Desserts',
    items: [
      {
        id: 'i6',
        name: 'Classic Tiramisù',
        description: 'Mascarpone cream, espresso-soaked savoiardi, Valrhona cocoa.',
        price: 11,
        image: '/images/tiramisu.jpg',
        tags: ['signature'],
      },
    ],
  },
  {
    id: 'drinks',
    name: 'Drinks',
    items: [
      {
        id: 'i7',
        name: 'Aperol Spritz',
        description: 'Aperol, prosecco, soda, fresh orange. The Italian ritual.',
        price: 12,
        image: '/images/spritz.jpg',
        tags: ['signature'],
        popular: true,
      },
    ],
  },
];

const TAG_META: Record<Tag, { label: string; icon: typeof Star; color: string; bg: string }> = {
  signature: {
    label: 'Signature',
    icon: Star,
    color: 'text-amber-700',
    bg: 'bg-amber-50 border-amber-200',
  },
  new: {
    label: 'New',
    icon: Sparkles,
    color: 'text-rose-700',
    bg: 'bg-rose-50 border-rose-200',
  },
  spicy: {
    label: 'Spicy',
    icon: Flame,
    color: 'text-red-700',
    bg: 'bg-red-50 border-red-200',
  },
  vegan: {
    label: 'Vegan',
    icon: Leaf,
    color: 'text-emerald-700',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  'gluten-free': {
    label: 'Gluten-Free',
    icon: WheatOff,
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
  },
};

/* ---------- App ---------- */

export default function App() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState(CATEGORIES[0].id);
  const [scrolled, setScrolled] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // IntersectionObserver to auto-highlight the active category while scrolling
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setActiveCat(visible.target.id);
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    CATEGORIES.forEach((c) => {
      const el = document.getElementById(c.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  const cartCount = useMemo(
    () => Object.values(cart).reduce((a, b) => a + b, 0),
    [cart],
  );
  const cartTotal = useMemo(() => {
    let total = 0;
    Object.entries(cart).forEach(([id, qty]) => {
      const item = CATEGORIES.flatMap((c) => c.items).find((i) => i.id === id);
      if (item) total += item.price * qty;
    });
    return total;
  }, [cart]);

  const addItem = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const removeItem = (id: string) =>
    setCart((c) => {
      const next = { ...c };
      if (!next[id]) return next;
      if (next[id] === 1) delete next[id];
      else next[id]--;
      return next;
    });

  const scrollToCategory = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased">
      {/* Sticky header */}
      <header
        className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${
          scrolled
            ? 'bg-stone-50/90 backdrop-blur-md border-b border-stone-200'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-3xl mx-auto px-5 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-700 to-orange-900 flex items-center justify-center shadow-sm">
              <span className="text-base">🍝</span>
            </div>
            <div>
              <p
                className={`text-sm font-bold leading-tight transition ${
                  scrolled ? 'text-stone-900' : 'text-stone-900'
                }`}
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                Osteria Luna
              </p>
              <p className="text-[10px] text-stone-500 leading-tight">Italian · Since 2014</p>
            </div>
          </div>
          <button
            onClick={() => setCartOpen(true)}
            className="relative h-10 w-10 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
            aria-label="Open cart"
          >
            <ShoppingBag className="h-4 w-4" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center ring-2 ring-stone-50">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16">
        <div className="relative h-[360px] sm:h-[420px] overflow-hidden">
          <img
            src="/images/hero.jpg"
            alt="Restaurant interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 to-transparent" />

          <div className="absolute bottom-0 inset-x-0 p-6 text-white max-w-3xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-medium">
                <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                <span>4.8</span>
                <span className="opacity-70">· 1.2k reviews</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-medium">
                <Clock className="h-3 w-3" />
                <span>Open until 11 PM</span>
              </span>
            </div>
            <h1
              className="text-4xl sm:text-5xl font-bold tracking-tight"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Handcrafted <em className="italic text-amber-200">Italian</em>,
              <br /> made with heart.
            </h1>
            <p className="mt-2.5 text-sm text-stone-200 max-w-md leading-relaxed">
              Fresh pasta, wood-fired pizza, and a cellar curated from the hills of Piedmont.
              Buon appetito.
            </p>
          </div>
        </div>
      </section>

      {/* Category nav */}
      <nav className="sticky top-[60px] z-30 bg-stone-50/95 backdrop-blur-md border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-5 flex items-center gap-1.5 overflow-x-auto scrollbar-none py-2.5">
          {CATEGORIES.map((cat) => {
            const isActive = activeCat === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat.name}
                <span className={`ml-1.5 ${isActive ? 'text-stone-400' : 'text-stone-400'}`}>
                  {cat.items.length}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Menu sections */}
      <main className="max-w-3xl mx-auto px-5 pb-40">
        {CATEGORIES.map((cat, ci) => (
          <section key={cat.id} id={cat.id} className="pt-10">
            <div className="flex items-end justify-between mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-amber-700 font-semibold mb-1">
                  {String(ci + 1).padStart(2, '0')} / Menu
                </p>
                <h2
                  className="text-3xl font-bold text-stone-900"
                  style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
                >
                  {cat.name}
                </h2>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-stone-400">
                <ChevronDown className="h-3.5 w-3.5" />
                <span>{cat.items.length} items</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {cat.items.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item}
                  qty={cart[item.id] ?? 0}
                  onAdd={() => addItem(item.id)}
                  onRemove={() => removeItem(item.id)}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Footer info */}
        <footer className="mt-14 pt-8 border-t border-stone-200">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-sm">
            <InfoBlock
              icon={<MapPin className="h-4 w-4" />}
              title="Visit us"
              line1="142 Mulberry Street"
              line2="Little Italy, NY 10013"
            />
            <InfoBlock
              icon={<Clock className="h-4 w-4" />}
              title="Hours"
              line1="Tue — Thu · 5 PM – 10 PM"
              line2="Fri — Sun · 5 PM – 11 PM"
            />
            <InfoBlock
              icon={<PhoneIcon className="h-4 w-4" />}
              title="Reservations"
              line1="(212) 555-0142"
              line2="hello@osterialuna.com"
            />
          </div>
          <p className="mt-8 text-center text-xs text-stone-400">
            © {new Date().getFullYear()} Osteria Luna · Crafted with care in Little Italy
          </p>
        </footer>
      </main>

      {/* Floating cart bar */}
      {cartCount > 0 && !cartOpen && (
        <div className="fixed bottom-5 inset-x-0 z-40 px-5 pointer-events-none">
          <button
            onClick={() => setCartOpen(true)}
            className="pointer-events-auto max-w-3xl mx-auto w-full bg-stone-900 hover:bg-stone-800 text-white rounded-2xl px-5 py-4 flex items-center justify-between shadow-2xl shadow-stone-900/25 transition-all active:scale-[0.99]"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center">
                  <ShoppingBag className="h-4 w-4" />
                </div>
                <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <div className="text-left">
                <p className="text-xs text-stone-400">Your order</p>
                <p className="text-sm font-semibold">
                  {cartCount} {cartCount === 1 ? 'item' : 'items'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-base font-bold">${cartTotal.toFixed(2)}</p>
              <div className="h-8 w-8 rounded-full bg-white/10 flex items-center justify-center">
                <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          cart={cart}
          total={cartTotal}
          onClose={() => setCartOpen(false)}
          onAdd={addItem}
          onRemove={removeItem}
        />
      )}
    </div>
  );
}

/* ---------- Item Card ---------- */

function ItemCard({
  item,
  qty,
  onAdd,
  onRemove,
}: {
  item: Item;
  qty: number;
  onAdd: () => void;
  onRemove: () => void;
}) {
  return (
    <article className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:border-stone-300 transition-all">
      <div className="flex flex-col h-full">
        {/* Image */}
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            loading="lazy"
          />
          {item.popular && (
            <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-stone-900/85 backdrop-blur-sm text-white text-[10px] font-semibold uppercase tracking-wider">
              <Flame className="h-3 w-3 fill-amber-300 text-amber-300" />
              Popular
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5 sm:gap-3">
            <div className="min-w-0">
              <h3
                className="text-sm sm:text-lg font-bold text-stone-900 leading-tight"
                style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
              >
                {item.name}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-stone-600 leading-snug sm:leading-relaxed line-clamp-2">{item.description}</p>
            </div>
            <span
              className="shrink-0 text-sm sm:text-lg font-bold text-stone-900"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              ${item.price}
            </span>
          </div>

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 sm:gap-1.5 sm:mt-3">
              {item.tags.map((t) => {
                const meta = TAG_META[t];
                const Icon = meta.icon;
                return (
                  <span
                    key={t}
                    className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold border ${meta.bg} ${meta.color}`}
                  >
                    <Icon className="h-3 w-3" />
                    {meta.label}
                  </span>
                );
              })}
            </div>
          )}

          {/* Add button */}
          <div className="mt-auto pt-3 sm:pt-4 flex items-center justify-end">
            {qty === 0 ? (
              <button
                onClick={onAdd}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 rounded-full bg-stone-900 text-white text-[11px] sm:text-xs font-semibold hover:bg-stone-800 active:scale-95 transition"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </button>
            ) : (
              <div className="inline-flex items-center gap-1 bg-stone-100 rounded-full p-1">
                <button
                  onClick={onRemove}
                  className="h-8 w-8 rounded-full bg-white text-stone-700 flex items-center justify-center shadow-sm hover:bg-stone-50 active:scale-95 transition"
                  aria-label="Remove"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-7 text-center text-sm font-bold text-stone-900 tabular-nums">
                  {qty}
                </span>
                <button
                  onClick={onAdd}
                  className="h-8 w-8 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-sm hover:bg-stone-800 active:scale-95 transition"
                  aria-label="Add"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ---------- Info Block ---------- */

function InfoBlock({
  icon,
  title,
  line1,
  line2,
}: {
  icon: React.ReactNode;
  title: string;
  line1: string;
  line2: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-amber-700 mb-1.5">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-wider">{title}</span>
      </div>
      <p className="text-sm text-stone-800 font-medium">{line1}</p>
      <p className="text-sm text-stone-500">{line2}</p>
    </div>
  );
}

/* ---------- Cart Drawer ---------- */

function CartDrawer({
  cart,
  total,
  onClose,
  onAdd,
  onRemove,
}: {
  cart: Record<string, number>;
  total: number;
  onClose: () => void;
  onAdd: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const allItems = CATEGORIES.flatMap((c) => c.items);
  const cartItems = Object.entries(cart)
    .map(([id, qty]) => {
      const item = allItems.find((i) => i.id === id);
      return item ? { item, qty } : null;
    })
    .filter((x): x is { item: Item; qty: number } => x !== null);

  const tax = total * 0.0875;
  const grandTotal = total + tax;

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out]"
        onClick={onClose}
      />
      <div className="absolute right-0 top-0 bottom-0 w-full max-w-md bg-stone-50 shadow-2xl flex flex-col animate-[slideIn_0.25s_ease-out]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200">
          <div>
            <h3
              className="text-xl font-bold text-stone-900"
              style={{ fontFamily: '"Playfair Display", Georgia, serif' }}
            >
              Your order
            </h3>
            <p className="text-xs text-stone-500">
              {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="h-9 w-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-700 transition"
            aria-label="Close cart"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {cartItems.length === 0 && (
            <p className="text-center text-sm text-stone-500 py-12">Your order is empty.</p>
          )}
          {cartItems.map(({ item, qty }) => (
            <div
              key={item.id}
              className="flex items-center gap-3 bg-white rounded-xl p-3 border border-stone-200"
            >
              <img
                src={item.image}
                alt={item.name}
                className="h-16 w-16 rounded-lg object-cover shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-stone-900 truncate">{item.name}</p>
                <p className="text-sm text-stone-600">${(item.price * qty).toFixed(2)}</p>
              </div>
              <div className="inline-flex items-center gap-1 bg-stone-100 rounded-full p-0.5">
                <button
                  onClick={() => onRemove(item.id)}
                  className="h-7 w-7 rounded-full bg-white flex items-center justify-center text-stone-700 shadow-sm"
                  aria-label="Remove"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-6 text-center text-xs font-bold">{qty}</span>
                <button
                  onClick={() => onAdd(item.id)}
                  className="h-7 w-7 rounded-full bg-stone-900 text-white flex items-center justify-center"
                  aria-label="Add"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {cartItems.length > 0 && (
          <div className="border-t border-stone-200 bg-white p-5 space-y-3">
            <div className="flex justify-between text-sm text-stone-600">
              <span>Subtotal</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-600">
              <span>Tax (8.75%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-stone-900 pt-3 border-t border-dashed border-stone-200">
              <span>Total</span>
              <span>${grandTotal.toFixed(2)}</span>
            </div>
            <button className="w-full py-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold shadow-lg shadow-amber-600/20 transition">
              Place order · ${grandTotal.toFixed(2)}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
