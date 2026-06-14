import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, ShoppingBag, Plus, Minus, X, Utensils, Home, Star, Clock, MapPin, Phone, History, Flame, Leaf, Sparkles, ChevronRight, ArrowUpDown, Menu, Loader2 } from 'lucide-react';
import { Timestamp, doc, setDoc, onSnapshot, collection, serverTimestamp, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useRestaurant } from '../../hooks/useRestaurant';
import { useMenu } from '../../hooks/useMenu';
import { createWaterRequest, getTableById } from '../../firebase/db';
import { db, auth } from '../../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { formatCurrency } from '../../utils/formatters';
import type { MenuItem, Order } from '../../types';
import { useCartStore } from '../../store/useCartStore';
import { BlurImage } from '../../components/ui/BlurImage';
let top3SetCache: Set<string> = new Set();
function updateTop3Cache(allItems: MenuItem[]) {
  const scored = allItems.map(item => {
    const code = item.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return { id: item.id, score: (4.7 + (code % 4) * 0.1) * 1000 + 120 + (code % 380) };
  });
  scored.sort((a, b) => b.score - a.score);
  top3SetCache = new Set(scored.slice(0, 3).map(x => x.id));
}
export function isItemTopRated(item: MenuItem): boolean {
  return top3SetCache.has(item.id);
}

export default function MenuPage() {
  const { restaurantSlug } = useParams<{ restaurantSlug: string }>();
  const [searchParams] = useSearchParams();
  const queryTable = searchParams.get('table') ?? '';

  const {
    tableNumber, setTableNumber,
    tableId, setTableId,
    activeTab, setActiveTab,
    cart, addToCart, removeFromCart, clearCart,
    cartOpen, setCartOpen,
    customerName, setCustomerName,
    note, setNote
  } = useCartStore();

  const { restaurant, loading: rLoading, notFound } = useRestaurant(restaurantSlug);

  const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';

  useEffect(() => {
    async function resolveTable() {
      if (!queryTable || !restaurant?.id) return;
      if (queryTable === tableId || queryTable === tableNumber) return; // Already resolved
      
      if (hasFirebase) {
        try {
          const tableData = await getTableById(restaurant.id, queryTable);
          if (tableData) {
            setTableNumber(tableData.number);
            setTableId(tableData.id);
          } else {
            setTableNumber(queryTable);
            setTableId(queryTable);
          }
        } catch (e) {
          console.error("Failed to resolve table", e);
          setTableNumber(queryTable);
          setTableId(queryTable);
        }
      } else {
        setTableNumber(queryTable);
        setTableId(queryTable);
      }
    }
    resolveTable();
  }, [queryTable, restaurant?.id, tableId, tableNumber, setTableNumber, setTableId, hasFirebase]);

  useEffect(() => {
    if (hasFirebase) {
      const unsubscribe = onAuthStateChanged(auth, () => {
        if (!auth.currentUser) {
          signInAnonymously(auth).catch(console.error);
        }
      });
      return () => unsubscribe();
    }
  }, [hasFirebase]);
  const { categories, items, loading: mLoading } = useMenu(restaurant?.id ?? null);

  useEffect(() => {
    if (items?.length > 0) updateTop3Cache(items);
  }, [items]);

  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('all');
  const [showSpecialRequest, setShowSpecialRequest] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [activeOrdersVersion, setActiveOrdersVersion] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requestCooldown, setRequestCooldown] = useState(0);

  // States for dynamic Water options modal
  const [waterModalOpen, setWaterModalOpen] = useState(false);
  const [selectedWaterOptId, setSelectedWaterOptId] = useState<string>('');
  const [waterQty, setWaterQty] = useState(1);

  // States for Add Extra Items modal
  const [selectedOrderForExtra, setSelectedOrderForExtra] = useState<Order | null>(null);
  const [extraItemsCart, setExtraItemsCart] = useState<Record<string, number>>({});
  const [extraSearchQuery, setExtraSearchQuery] = useState('');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  const [vegFilter, setVegFilter] = useState<'all' | 'veg' | 'nonveg'>('all');
  const [popularFilter, setPopularFilter] = useState(false);
  const [priceSort, setPriceSort] = useState<'none' | 'asc' | 'desc'>('none');
  const [headerShadow, setHeaderShadow] = useState(false);

  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});
  const categoryTabsRef = useRef<HTMLDivElement | null>(null);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  // Scroll shadow for header
  useEffect(() => {
    const handler = () => setHeaderShadow(window.scrollY > 10);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (requestCooldown > 0) {
      const timer = setTimeout(() => setRequestCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [requestCooldown]);

  // Active orders tracking
  useEffect(() => {
    if (!restaurant?.id) return;
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';
    if (!hasFirebase) return;
    const storedStr = localStorage.getItem('scanmenu_active_orders');
    if (!storedStr) return;
    let stored: Array<{ sessionId: string; orderId: string; tableNumber?: string }> = [];
    try { stored = JSON.parse(storedStr); } catch (e) { console.error(e); }
    const filtered = stored.filter(o => o.tableNumber === tableNumber);
    const pruned = stored.filter(o => o.tableNumber && o.tableNumber !== tableNumber);
    if (pruned.length > 0) {
      const cleaned = stored.filter(o => !o.tableNumber || o.tableNumber === tableNumber);
      localStorage.setItem('scanmenu_active_orders', JSON.stringify(cleaned));
    }
    if (filtered.length === 0) return;
    const unsubs: Array<() => void> = [];
    const activeDataMap: Record<string, Order> = {};
    filtered.forEach(({ sessionId, orderId }) => {
      const docRef = doc(db, 'restaurants', restaurant.id, 'orders', orderId);
      const unsub = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const orderData = docSnap.data() as Order;
          if (orderData.status === 'completed' || orderData.status === 'cancelled') {
            const currentStored: Array<{ orderId: string }> = JSON.parse(localStorage.getItem('scanmenu_active_orders') || '[]');
            const filteredStored = currentStored.filter(o => o.orderId !== orderId);
            localStorage.setItem('scanmenu_active_orders', JSON.stringify(filteredStored));
            if (filteredStored.length === 0) localStorage.removeItem('scanmenu_locked_table');
            delete activeDataMap[orderId];
            setActiveOrdersVersion(v => v + 1);
          } else {
            activeDataMap[orderId] = { ...orderData, id: orderId, sessionId } as Order;
          }
          setActiveOrders(Object.values(activeDataMap).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        } else {
          const currentStored: Array<{ orderId: string }> = JSON.parse(localStorage.getItem('scanmenu_active_orders') || '[]');
          const filteredStored = currentStored.filter(o => o.orderId !== orderId);
          localStorage.setItem('scanmenu_active_orders', JSON.stringify(filteredStored));
          if (filteredStored.length === 0) localStorage.removeItem('scanmenu_locked_table');
          delete activeDataMap[orderId];
          setActiveOrdersVersion(v => v + 1);
          setActiveOrders(Object.values(activeDataMap).sort((a, b) => (b.createdAt?.seconds ?? 0) - (a.createdAt?.seconds ?? 0)));
        }
      });
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach(unsub => unsub()); };
  }, [restaurant?.id, tableNumber, activeOrdersVersion]);

  // Active category scroll tracking
  useEffect(() => {
    if (search || categories.length === 0) return;

    const handleScroll = () => {
      if (window.scrollY < 100) {
        setActiveCategory('all');
        return;
      }

      // Approximately the height of sticky headers (header 60 + filters 48 + nav 50 + padding)
      const offset = 180;
      let currentActive = 'all';

      for (const cat of categories) {
        const el = categoryRefs.current[cat.id];
        if (el) {
          const rect = el.getBoundingClientRect();
          // If the top of the section is above or near our sticky offset, it's active
          if (rect.top <= offset + 50) {
            currentActive = cat.id;
          }
        }
      }

      setActiveCategory(currentActive);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories, search, items]);

  useEffect(() => {
    if (!categoryTabsRef.current) return;
    const container = categoryTabsRef.current;
    const activeButton = container.querySelector('[data-active="true"]') as HTMLButtonElement | null;
    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      const scrollOffset = buttonRect.left - containerRect.left + container.scrollLeft - (containerRect.width / 2) + (buttonRect.width / 2);

      container.scrollTo({ left: scrollOffset, behavior: 'smooth' });
    }
  }, [activeCategory]);

  const activeItems = useMemo(() => items.filter(i => i.isAvailable), [items]);
  const filteredItems = useMemo(() => activeItems.filter(i => {
    if (vegFilter === 'veg' && !i.isVeg) return false;
    if (vegFilter === 'nonveg' && i.isVeg) return false;
    if (popularFilter && !isItemTopRated(i)) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    if (priceSort === 'asc') return a.price - b.price;
    if (priceSort === 'desc') return b.price - a.price;
    return 0;
  }), [activeItems, vegFilter, popularFilter, search, priceSort]);
  const waterOptions = useMemo(() => {
    if (!restaurant?.waterBottle?.enabled) return [];
    if (restaurant.waterBottle.options && restaurant.waterBottle.options.length > 0) {
      return restaurant.waterBottle.options;
    }
    const legacyMl = restaurant.waterBottle.ml ? `${restaurant.waterBottle.ml}ml` : '1L';
    const legacyPrice = restaurant.waterBottle.price ?? 20;
    return [{ id: 'legacy', ml: legacyMl, price: legacyPrice }];
  }, [restaurant]);

  useEffect(() => {
    if (waterOptions.length > 0 && !selectedWaterOptId) {
      setSelectedWaterOptId(waterOptions[0].id);
    }
  }, [waterOptions, selectedWaterOptId]);

  function getQty(itemId: string) {
    return cart.filter(c => c.itemId === itemId || c.itemId.startsWith(itemId + '-combo-')).reduce((s, i) => s + i.qty, 0);
  }

  function requestWaterBottle() {
    if (requestCooldown > 0) {
      toast.error(`Please wait ${requestCooldown} seconds before requesting again.`);
      return;
    }
    if (waterOptions.length === 0) {
      toast.error("Water bottle requests are not configured.");
      return;
    }
    setWaterQty(1);
    setWaterModalOpen(true);
  }

  function callWaiter() {
    if (requestCooldown > 0) {
      toast.error(`Please wait ${requestCooldown} seconds before calling again.`);
      return;
    }
    let finalTable = tableNumber;
    if (!finalTable) {
      const inputTable = window.prompt("Enter your table number (or leave empty for Takeaway):");
      if (inputTable === null) return;
      finalTable = inputTable.trim() || 'Takeaway';
      if (finalTable !== 'Takeaway') {
        setTableNumber(finalTable);
      }
    }
    if (hasFirebase && restaurant?.id) {
      createWaterRequest(restaurant.id, finalTable, 1, 'waiter')
        .then(() => {
          toast.success("Waiter called!");
          setRequestCooldown(60);
        })
        .catch(() => toast.error("Failed to call waiter."));
    } else {
      toast.success("Waiter called (Demo mode)");
    }
  }

  async function handleAddExtraItemsToOrder() {
    if (!restaurant || !selectedOrderForExtra || isUpdatingOrder) return;
    
    const selectedItemIds = Object.keys(extraItemsCart).filter(id => extraItemsCart[id] > 0);
    if (selectedItemIds.length === 0) {
      toast.error('Please select at least one item');
      return;
    }
    
    setIsUpdatingOrder(true);
    try {
      const updatedItems = [...selectedOrderForExtra.items.map(item => ({ ...item }))];
      
      for (const itemId of selectedItemIds) {
        const qtyToAdd = extraItemsCart[itemId];
        
        const existingExtra = updatedItems.find(i => i.itemId === itemId && i.isExtra);
        if (existingExtra) {
          existingExtra.qty += qtyToAdd;
        } else {
          if (itemId.includes('-combo-')) {
            const parts = itemId.split('-combo-');
            const baseId = parts[0];
            const paxStr = parts[1];
            const pax = parseInt(paxStr, 10);
            
            const menuItem = items.find(i => i.id === baseId);
            if (!menuItem) continue;
            const cp = menuItem.comboPrices?.find(c => c.persons === pax);
            if (!cp) continue;
            
            updatedItems.push({
              itemId: itemId,
              name: `${menuItem.name} (${cp.persons} Person${cp.persons > 1 ? 's' : ''})`,
              price: cp.price,
              qty: qtyToAdd,
              isVeg: menuItem.isVeg,
              isExtra: true
            });
          } else {
            const menuItem = items.find(i => i.id === itemId);
            if (!menuItem) continue;
            updatedItems.push({
              itemId: menuItem.id,
              name: menuItem.name,
              price: menuItem.price,
              qty: qtyToAdd,
              isVeg: menuItem.isVeg,
              isExtra: true
            });
          }
        }
      }
      
      const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price * item.qty, 0);
      const newTotal = Math.round(newSubtotal * 1.05 * 100) / 100;
      
      if (hasFirebase) {
        const orderRef = doc(db, 'restaurants', restaurant.id, 'orders', selectedOrderForExtra.id);
        await updateDoc(orderRef, {
          items: updatedItems,
          totalAmount: newTotal,
          updatedAt: Timestamp.now()
        });
        
        if (selectedOrderForExtra.sessionId) {
          const sessionRef = doc(db, 'sessions', selectedOrderForExtra.sessionId);
          await updateDoc(sessionRef, {
            items: updatedItems.map(item => ({
              name: item.name,
              price: item.price,
              qty: item.qty
            })),
            totalAmount: newTotal
          });
        }
      }

      toast.success('Extra items added successfully!');
      setSelectedOrderForExtra(null);
      setExtraItemsCart({});
      setExtraSearchQuery('');
    } catch (error: unknown) {
      console.error('Failed to add extra items:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Failed to add extra items: ${msg}`);
    } finally {
      setIsUpdatingOrder(false);
    }
  }

  async function addWaterAsExtra(order: Order, opt: { id: string; ml: string; price: number }, qty: number) {
    if (!restaurant) return;
    try {
      const updatedItems = [...order.items.map(item => ({ ...item }))];
      const itemId = `water-bottle-${opt.id}`;
      const existingExtra = updatedItems.find(i => i.itemId === itemId);
      if (existingExtra) {
        existingExtra.qty += qty;
      } else {
        updatedItems.push({
          itemId: itemId,
          name: `Water Bottle (${opt.ml})`,
          price: opt.price,
          qty: qty,
          isVeg: true,
          isExtra: true
        });
      }
      
      const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price * item.qty, 0);
      const newTotal = Math.round(newSubtotal * 1.05 * 100) / 100;
      
      if (hasFirebase) {
        const orderRef = doc(db, 'restaurants', restaurant.id, 'orders', order.id);
        await updateDoc(orderRef, {
          items: updatedItems,
          totalAmount: newTotal,
          updatedAt: Timestamp.now()
        });
        
        if (order.sessionId) {
          const sessionRef = doc(db, 'sessions', order.sessionId);
          await updateDoc(sessionRef, {
            items: updatedItems.map(item => ({
              name: item.name,
              price: item.price,
              qty: item.qty
            })),
            totalAmount: newTotal
          });
        }
      }
      toast.success(`Request sent! Added ${qty}x Water Bottle (${opt.ml}) directly to your active order.`);
    } catch (error: any) {
      console.error('Failed to add water as extra:', error);
      toast.error('Failed to add water bottle to active order.');
    }
  }

  async function placeOrder() {
    if (!restaurant) return;

    const finalCustomerName = customerName.trim() || 'User';
    setPlacing(true);
    try {
      // Ensure the user is fully signed in anonymously before proceeding
      let currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        const userCred = await signInAnonymously(auth);
        currentUid = userCred.user.uid;
      }

      // Check if there is an active unpaid order for this table
      const unpaidActiveOrder = activeOrders.find(
        (o) =>
          o.paymentStatus !== 'paid' &&
          (o.status === 'pending' || o.status === 'preparing')
      );

      if (unpaidActiveOrder) {
        // Append cart items to the existing active order
        const updatedItems = [...unpaidActiveOrder.items.map(item => ({ ...item }))];
        
        for (const cartItem of cart) {
          const existingExtra = updatedItems.find(i => i.itemId === cartItem.itemId && i.isExtra);
          if (existingExtra) {
            existingExtra.qty += cartItem.qty;
          } else {
            updatedItems.push({
              itemId: cartItem.itemId,
              name: cartItem.name,
              price: cartItem.price,
              qty: cartItem.qty,
              isVeg: cartItem.isVeg,
              isExtra: true
            });
          }
        }
        
        const newSubtotal = updatedItems.reduce((acc, item) => acc + item.price * item.qty, 0);
        const newTotal = Math.round(newSubtotal * 1.05 * 100) / 100;
        
        if (hasFirebase) {
          const orderRef = doc(db, 'restaurants', restaurant.id, 'orders', unpaidActiveOrder.id);
          await updateDoc(orderRef, {
            items: updatedItems,
            totalAmount: newTotal,
            updatedAt: Timestamp.now()
          });
          
          if (unpaidActiveOrder.sessionId) {
            const sessionRef = doc(db, 'sessions', unpaidActiveOrder.sessionId);
            await updateDoc(sessionRef, {
              items: updatedItems.map(item => ({
                name: item.name,
                price: item.price,
                qty: item.qty
              })),
              totalAmount: newTotal
            });
          }
        }
        
        clearCart();
        setCartOpen(false);
        toast.success('Items added to your active order!');
        setActiveTab('history');
        setActiveOrdersVersion(v => v + 1);
        return;
      }

      // If no active unpaid order, place a new order
      const sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);

      const finalTotal = Math.round(cartTotal * 1.05 * 100) / 100;
      const orderRef = doc(collection(db, 'restaurants', restaurant.id, 'orders'));
      const orderId = orderRef.id;

      await setDoc(orderRef, {
        customerId: currentUid,
        customerName: finalCustomerName,
        tableId: tableId || tableNumber,
        tableNumber,
        items: cart,
        totalAmount: finalTotal,
        status: 'pending',
        note: note || '',
        ratingSubmitted: false,
        paymentStatus: 'unpaid',
        sessionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantSlug: restaurant.slug,
        tableNumber,
        customerName: finalCustomerName,
        items: cart,
        totalAmount: finalTotal,
        upiId: restaurant.upiId || '',
        upiType: restaurant.upiType || 'personal',
        customerId: currentUid,
        status: 'pending_payment',
        orderId,
        expiresAt: new Timestamp(
          Math.floor((Date.now() + 60 * 60 * 1000) / 1000),
          0
        ),
      });

      const activeOrdersList = JSON.parse(localStorage.getItem('scanmenu_active_orders') || '[]');
      activeOrdersList.push({ sessionId, orderId, tableNumber });
      localStorage.setItem('scanmenu_active_orders', JSON.stringify(activeOrdersList));
      localStorage.setItem('scanmenu_locked_table', tableNumber);
      localStorage.setItem('lastOrderId', orderId);
      localStorage.setItem('lastRestaurantSlug', restaurantSlug ?? '');

      clearCart();
      setCartOpen(false);
      toast.success('Order placed!');
      setActiveTab('history');
      setActiveOrdersVersion(v => v + 1);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Failed to place order';
      toast.error(msg);
    } finally {
      setPlacing(false);
    }
  }

  function scrollToCategory(catId: string) {
    setActiveCategory(catId);
    if (catId === 'all') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const el = categoryRefs.current[catId];
      if (el) {
        const offset = 70;
        window.scrollTo({
          top: el.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth'
        });
      }
    }
  }

  const loading = rLoading || mLoading;

  if (notFound) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <Utensils className="w-16 h-16 text-stone-300 mb-4" />
        <h1 className="text-xl font-bold text-stone-850">Restaurant not found</h1>
        <p className="text-stone-500 text-sm mt-2">The menu you're looking for doesn't exist.</p>
        <a href="/" className="mt-6 flex items-center gap-2 bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Home className="w-4 h-4" /> Go Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased text-stone-900 flex justify-center">
      <div className="w-full max-w-[480px] md:max-w-6xl bg-stone-50 min-h-screen relative pb-36 md:pb-12 md:px-6 md:flex md:gap-8 md:items-start md:pt-24">

        {/* ===== STICKY HEADER ===== */}
        <header className={`fixed top-0 inset-x-0 z-40 transition-all duration-300 ${headerShadow ? 'bg-stone-50/90 backdrop-blur-md border-b border-stone-200' : 'bg-transparent'}`}>
          <div className="max-w-[480px] md:max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {restaurant?.logoUrl ? (
                <BlurImage src={restaurant.logoUrl} width={100} className="h-9 w-9 rounded-full shadow-sm border border-stone-200 bg-white" alt="logo" />
              ) : (
                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-amber-700 to-orange-900 flex items-center justify-center shadow-sm text-white">
                  <span>🍝</span>
                </div>
              )}
              <div className="text-left">
                <p className="text-sm font-bold leading-tight text-stone-900 font-display pr-2">
                  {restaurant?.name ?? ''}
                </p>
                <p className="text-[10px] text-stone-500 leading-tight">
                  Digital Menu{tableNumber ? ` · Table ${tableNumber}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {activeTab === 'menu' && (
                <button
                  onClick={() => { if (searchOpen) setSearch(''); setSearchOpen(!searchOpen); }}
                  className={`w-9 h-9 flex items-center justify-center rounded-full transition-all ${searchOpen ? 'bg-amber-50 text-amber-800' : 'bg-white/70 border border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                  aria-label="Search"
                >
                  {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={() => setCartOpen(true)}
                className="relative h-9 w-9 rounded-full bg-stone-900 text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition"
                aria-label="Open cart"
              >
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4.5 min-w-4.5 px-1 rounded-full bg-amber-500 text-[9px] font-bold flex items-center justify-center ring-2 ring-stone-50">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* ===== DESKTOP LEFT RAIL ===== */}
        {activeTab === 'menu' && !searchOpen && (
          <aside className="hidden md:block w-64 shrink-0 sticky top-24 h-[calc(100vh-8rem)] overflow-y-auto scrollbar-none pb-12 border-r border-stone-200/60 pr-6">
            <h3 className="font-bold text-lg mb-4 text-stone-900 font-display px-2">Menu Index</h3>
            <ul className="space-y-1">
              <li>
                <button onClick={() => scrollToCategory('all')} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${activeCategory === 'all' ? 'bg-[#1a1a1a] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}>All Items</button>
              </li>
              {categories.map(cat => {
                const isActive = activeCategory === cat.id;
                const filteredCount = filteredItems.filter(i => i.categoryId === cat.id).length;
                if (activeItems.filter(i => i.categoryId === cat.id).length === 0) return null;
                return (
                  <li key={cat.id}>
                    <button onClick={() => scrollToCategory(cat.id)} className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors flex justify-between items-center ${isActive ? 'bg-[#1a1a1a] text-white shadow-md' : 'text-stone-600 hover:bg-stone-100'}`}>
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className={`text-xs shrink-0 font-bold ${isActive ? 'opacity-80' : 'opacity-40'}`}>{filteredCount}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}

        {/* ===== CENTER MAIN CONTENT ===== */}
        <div className="flex-1 min-w-0 max-w-[480px] mx-auto md:max-w-none md:mx-0 w-full">

        {/* ===== HERO COVER ===== */}
        {activeTab === 'menu' && (
          <section className="relative pt-15 md:pt-0 text-left md:rounded-2xl md:overflow-hidden md:mb-6">
            <div className="relative h-[280px] overflow-hidden">
              <BlurImage
                src={restaurant?.coverImageUrl || restaurant?.logoUrl || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800'}
                width={1200}
                alt="Cover"
                className="w-full h-full"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-950/85 via-stone-950/30 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-stone-950/30 to-transparent" />

              <div className="absolute bottom-0 inset-x-0 p-5 text-white">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-medium">
                    <Star className="h-3 w-3 fill-amber-300 text-amber-300" />
                    <span>4.8</span>
                    <span className="opacity-70">· 1.2k reviews</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[10px] font-medium">
                    <Clock className="h-3 w-3" />
                    <span>Open 7 Days</span>
                  </span>
                </div>
                <h1 className="text-3xl font-bold tracking-tight">
                  {restaurant?.name ?? 'Osteria Luna'}
                </h1>
                <p className="mt-1.5 text-xs text-stone-200 max-w-sm leading-relaxed truncate">
                  {restaurant?.description || 'Fresh ingredients, curated recipes. Buon appetito.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* ===== SEARCH INPUT ===== */}
        {activeTab === 'menu' && searchOpen && (
          <div className="px-5 py-2.5 bg-stone-50 sticky top-[60px] z-30 flex items-center gap-2">
            <div className="relative flex-1 rounded-lg bg-white border border-stone-200 shadow-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search for dishes..."
                className="w-full bg-transparent rounded-lg pl-10 pr-8 py-2 text-sm focus:outline-none text-stone-900 placeholder:text-stone-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => { setSearch(''); setSearchOpen(false); }}
              className="text-sm font-medium text-stone-600 hover:text-stone-900 px-1"
            >
              Cancel
            </button>
          </div>
        )}

        {/* ===== FILTER PILLS ===== */}
        {activeTab === 'menu' && !searchOpen && (
          <div className="sticky top-[60px] z-30 bg-stone-50 border-b border-stone-200/60 py-2.5 px-5">
            <div className="flex gap-2 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setPriceSort(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all duration-150 ${priceSort !== 'none' ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <ArrowUpDown className="h-3 w-3" /> {priceSort === 'none' ? 'Price' : priceSort === 'asc' ? 'Price: Low' : 'Price: High'}
              </button>
              <button
                onClick={() => setVegFilter(vegFilter === 'veg' ? 'all' : 'veg')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all duration-150 ${vegFilter === 'veg' ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Leaf className="h-3 w-3" /> Veg
              </button>
              <button
                onClick={() => setVegFilter(vegFilter === 'nonveg' ? 'all' : 'nonveg')}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition-all duration-150 ${vegFilter === 'nonveg' ? 'bg-red-600 border-red-600 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Flame className="h-3 w-3" /> Non-Veg
              </button>
              <button
                onClick={() => setPopularFilter(!popularFilter)}
                className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1 border transition-all duration-150 ${popularFilter ? 'bg-stone-900 border-stone-900 text-white' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                <Sparkles className="h-3 w-3" /> Popular
              </button>
            </div>
          </div>
        )}

        {/* ===== CATEGORY NAV ===== */}
        {activeTab === 'menu' && !searchOpen && (
          <nav className="sticky top-[108px] z-30 bg-stone-50/95 backdrop-blur-sm border-b border-stone-200 py-2.5 px-5">
            <div ref={categoryTabsRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-none relative">
              <button
                data-active={activeCategory === 'all' ? 'true' : 'false'}
                onClick={() => scrollToCategory('all')}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${activeCategory === 'all' ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
              >
                All
              </button>
              {categories.map(cat => {
                const totalCount = activeItems.filter(i => i.categoryId === cat.id).length;
                if (totalCount === 0) return null;
                const filteredCount = filteredItems.filter(i => i.categoryId === cat.id).length;
                const isActive = activeCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    data-active={isActive ? 'true' : 'false'}
                    onClick={() => scrollToCategory(cat.id)}
                    className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${isActive ? 'bg-[#1a1a1a] border-[#1a1a1a] text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-100'}`}
                  >
                    {cat.name} <span className="opacity-60 ml-0.5">{filteredCount}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        )}

        {activeTab === 'menu' ? (
          <>
            {/* Water/Waiter Buttons */}
            {!search && (restaurant?.waterBottle?.enabled || restaurant?.callWaiter?.enabled) && (
              <div className="px-5 pt-4 pb-1 flex flex-col gap-3">
                {restaurant?.waterBottle?.enabled && (
                  <button onClick={requestWaterBottle} className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition shadow-sm flex items-center justify-center gap-2">
                    💧 Request Water
                  </button>
                )}
                {restaurant?.callWaiter?.enabled && (
                  <button onClick={callWaiter} className="w-full py-3 px-4 rounded-xl text-sm font-bold bg-[#fef3c7] text-[#d97706] hover:bg-amber-200 transition shadow-sm flex items-center justify-center gap-2">
                    🛎️ Call Waiter
                  </button>
                )}
              </div>
            )}

            {/* ===== DISHES CONTENT ===== */}
            <main className="px-5 pb-24 text-left">
              {loading ? (
                <div className="grid grid-cols-1 gap-4 pt-10">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <ItemCardSkeleton key={i} />
                  ))}
                </div>
              ) : search ? (
                filteredItems.length === 0 ? (
                  <div className="text-center py-20 bg-white border border-stone-200 rounded-2xl mt-6 px-4">
                    <Search className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                    <p className="text-stone-500 text-sm">No dishes match your search</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 pt-8">
                    {filteredItems.map(item => (
                      <ItemCard key={item.id} item={item} qty={getQty(item.id)} onAdd={addToCart} onRemove={removeFromCart} currency={restaurant?.currency ?? '₹'} />
                    ))}
                  </div>
                )
              ) : (
                categories.map((cat, ci) => {
                  const catTotal = activeItems.filter(i => i.categoryId === cat.id);
                  if (catTotal.length === 0) return null;

                  const catItems = filteredItems.filter(i => i.categoryId === cat.id);
                  return (
                    <section key={cat.id} id={cat.id} ref={el => { categoryRefs.current[cat.id] = el; }} className="pt-8 scroll-mt-[160px]">
                      <div className="mb-4">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-amber-700 font-semibold mb-1">
                          {String(ci + 1).padStart(2, '0')} / Menu
                        </p>
                        <h2 className="text-2xl font-bold text-stone-900 font-display">
                          {cat.name}
                        </h2>
                      </div>
                      {catItems.length === 0 ? (
                        <div className="py-8 bg-stone-50 border border-stone-200 border-dashed rounded-xl text-center">
                          <p className="text-stone-500 text-sm font-medium">Items not found for this filter</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-4">
                          {catItems.map(item => (
                            <ItemCard key={item.id} item={item} qty={getQty(item.id)} onAdd={addToCart} onRemove={removeFromCart} currency={restaurant?.currency ?? '₹'} />
                          ))}
                        </div>
                      )}
                    </section>
                  );
                })
              )}

              {/* Footer info */}
              {restaurant && (
                <footer className="mt-14 pt-8 border-t border-stone-200">
                  <div className="grid grid-cols-1 gap-5 text-sm">
                    <div>
                      <div className="flex items-center gap-2 text-amber-700 mb-1.5">
                        <MapPin className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Address</span>
                      </div>
                      <p className="text-stone-850 font-medium text-xs">{restaurant.address || 'Address configured in dashboard.'}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-amber-700 mb-1.5">
                        <Clock className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">Hours</span>
                      </div>
                      <p className="text-stone-850 font-medium text-xs">Open 11:00 AM — 11:00 PM · 7 Days</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-amber-700 mb-1.5">
                        <Phone className="h-4 w-4" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider">WhatsApp</span>
                      </div>
                      <p className="text-stone-850 font-medium text-xs">{restaurant.phone}</p>
                    </div>
                  </div>
                  <div className="mt-10 mb-4 text-center space-y-1">
                    <p className="text-[11px] text-stone-400">
                      © {new Date().getFullYear()} {restaurant.name}
                    </p>
                    <a href="/" target="_blank" rel="noopener noreferrer" className="inline-block text-[11px] font-semibold text-amber-600 hover:text-amber-700 transition-colors">
                      Want this for your restaurant? Get ScanMenu ✨
                    </a>
                  </div>
                </footer>
              )}
            </main>
          </>
        ) : (
          /* ===== ORDER HISTORY ===== */
          <div className="px-5 py-24 text-left">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-stone-900 font-display">My Orders</h2>
              <p className="text-xs text-stone-500 mt-1">{tableNumber ? `Table ${tableNumber}` : 'Track your active orders'}</p>
            </div>
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white rounded-2xl border border-dashed border-stone-200 space-y-3">
                <History className="w-9 h-9 text-stone-300 mx-auto" />
                <p className="font-semibold text-sm text-stone-800">No active orders</p>
                <p className="text-xs text-stone-500 max-w-[220px] mx-auto">Orders placed will appear here until completed by the restaurant.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-20">
                {activeOrders.filter(order => !tableNumber || order.tableNumber === tableNumber).map(order => (
                  <div key={order.id} className="bg-white border border-stone-200 rounded-xl p-4 space-y-3 shadow-sm text-left">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-sm text-stone-950">Table {order.tableNumber || tableNumber || '-'}</p>
                        <p className="text-[10px] text-stone-500 mt-0.5">Order: {order.id.slice(0, 8)}</p>
                        {order.createdAt && (
                          <p className="text-[10px] text-stone-400 mt-0.5">
                            Placed at: {new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${order.status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          order.status === 'preparing' ? 'bg-stone-50 text-stone-750 border border-stone-200' :
                            order.status === 'ready' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-gray-100 text-gray-500'
                          }`}>
                          {order.status === 'pending' ? 'Pending' :
                            order.status === 'preparing' ? 'In Kitchen' :
                              order.status === 'ready' ? 'Ready' : order.status}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[11px] font-semibold ${
                          order.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          order.paymentStatus === 'verifying' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {order.paymentStatus === 'paid' ? 'Paid' :
                           order.paymentStatus === 'verifying' ? 'Verifying' : 'Unpaid'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-stone-600 border-t border-stone-100 pt-2.5 space-y-1.5">
                      {order.items.map((item: import('../../types').OrderItem, idx: number) => (
                        <div key={idx} className="flex justify-between">
                          <span>{item.name} <span className="opacity-70 font-semibold">x{item.qty}</span></span>
                          <span className="font-semibold text-stone-800">{formatCurrency(item.price * item.qty, restaurant?.currency ?? '₹')}</span>
                        </div>
                      ))}
                      <div className="flex justify-between font-bold text-stone-950 pt-1.5 border-t border-dashed border-stone-200">
                        <span>Total Amount</span>
                        <span>{formatCurrency(order.totalAmount, restaurant?.currency ?? '₹')}</span>
                      </div>
                    </div>
                    {order.paymentStatus === 'unpaid' && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                          onClick={() => {
                            setSelectedOrderForExtra(order);
                            setExtraItemsCart({});
                            setExtraSearchQuery('');
                          }}
                          className="text-center bg-stone-100 hover:bg-stone-200 text-stone-850 font-bold py-3 px-2 rounded-lg text-xs transition shadow-sm"
                        >
                          + Add Extra Items
                        </button>
                        <a href={`/pay/${order.sessionId}`} className="block text-center bg-[#c86214] hover:bg-[#b05612] text-white font-bold py-3 px-2 rounded-lg text-xs transition shadow-sm flex items-center justify-center">
                          Pay / Checkout
                        </a>
                      </div>
                    )}
                    {order.paymentStatus === 'verifying' && (
                      <div className="text-center bg-blue-50 text-blue-750 font-bold py-3 rounded-lg text-xs border border-blue-200 mt-4">
                        Awaiting Admin Confirmation
                      </div>
                    )}
                    {order.paymentStatus === 'paid' && !order.ratingSubmitted && (
                      <a
                        href={`/${restaurantSlug}/rate/${order.id}`}
                        className="block text-center bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 rounded-lg text-xs transition shadow-sm mt-4 flex items-center justify-center gap-1.5"
                      >
                        <Star className="w-3.5 h-3.5 fill-white text-white" />
                        Leave a Rating
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        </div> {/* END CENTER MAIN CONTENT */}

        {/* ===== DESKTOP RIGHT CART ===== */}
        {activeTab === 'menu' && (
          <aside className="hidden md:flex w-[320px] shrink-0 sticky top-24 h-[calc(100vh-8rem)] flex-col bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="bg-stone-50 border-b border-stone-200 px-5 py-4">
              <h3 className="text-lg font-bold font-display text-stone-900">Your Order</h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5">{cartCount} {cartCount === 1 ? 'item' : 'items'}</p>
            </div>
            
            {cartCount === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-stone-400">
                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                <p className="text-sm font-medium">Your cart is empty</p>
                <p className="text-xs mt-1">Add items from the menu to start your order.</p>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-2">
                  {cart.map(item => (
                    <div key={item.itemId} className="flex items-center p-3 border-b border-stone-100 last:border-0">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="flex items-start gap-1.5">
                          <div className="mt-1 shrink-0">
                            {item.isVeg ? (
                              <div className="w-2.5 h-2.5 border border-green-600 flex items-center justify-center rounded-[2px]"><div className="w-1 h-1 bg-green-600 rounded-full" /></div>
                            ) : (
                              <div className="w-2.5 h-2.5 border border-red-600 flex items-center justify-center rounded-[2px]"><div className="w-1 h-1 bg-red-600 rounded-full" /></div>
                            )}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-stone-900 leading-tight">{item.name}</p>
                            <p className="text-[10px] font-medium text-stone-400 mt-0.5">{formatCurrency(item.price, restaurant?.currency ?? '₹')}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <span className="text-[13px] font-bold text-stone-900">{formatCurrency(item.price * item.qty, restaurant?.currency ?? '₹')}</span>
                        {item.itemId.startsWith('water-bottle-') ? (
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full select-none">
                            Requested (Qty: {item.qty})
                          </span>
                        ) : (
                          <div className="flex items-center gap-2 bg-white border border-stone-200 rounded-full p-0.5 min-h-[32px]">
                            <button onClick={() => removeFromCart(item.itemId)} className="w-7 h-7 rounded-full bg-stone-50 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"><Minus className="h-3 w-3" /></button>
                            <span className="w-4 text-center text-xs font-bold text-stone-900">{item.qty}</span>
                            <button onClick={() => addToCart({ id: item.itemId, name: item.name, price: item.price, isVeg: item.isVeg, imageUrl: item.imageUrl, qty: 1 })} className="w-7 h-7 rounded-full bg-stone-900 flex items-center justify-center text-white hover:bg-stone-800 transition-colors"><Plus className="h-3 w-3" /></button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-stone-50 p-4 border-t border-stone-200">
                  <div className="flex justify-between text-xs text-stone-500 mb-1">
                    <span>Subtotal</span><span>{formatCurrency(cartTotal, restaurant?.currency ?? '₹')}</span>
                  </div>
                  <div className="flex justify-between text-xs text-stone-500 mb-2 pb-2 border-b border-stone-200/60">
                    <span>Taxes (5%)</span><span>{formatCurrency(cartTotal * 0.05, restaurant?.currency ?? '₹')}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold text-stone-900 mb-4">
                    <span>Total</span><span>{formatCurrency(cartTotal * 1.05, restaurant?.currency ?? '₹')}</span>
                  </div>
                  <button onClick={() => setCartOpen(true)} className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2">
                    Checkout <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </aside>
        )}


        {/* ===== CART DRAWER ===== */}
        {cartOpen && (
          <div className="fixed inset-0 z-[60] flex justify-center items-end">
            <div
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setCartOpen(false)}
            />
            <div className="relative w-full h-auto max-h-[100dvh] max-w-[480px] bg-stone-50 shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              {/* Drawer Header */}
              <div className="bg-white shrink-0 border-b border-stone-200 pt-2 pb-2">
                <div className="w-10 h-1 bg-stone-200 rounded-full mx-auto mb-2" />
                <div className="flex items-center justify-between px-4">
                  <div className="text-left">
                    <h3 className="text-2xl font-bold text-stone-900 font-display leading-tight tracking-tight">
                      Your order
                    </h3>
                    <p className="text-sm text-stone-500 mt-1">
                      {cartCount} {cartCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="h-7 w-7 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition"
                    aria-label="Close cart"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Cart Items */}
              <div className="flex-1 min-h-0 overflow-y-auto bg-white px-4 py-1 space-y-0">
                {cart.map(item => (
                  <div
                    key={item.itemId}
                    className="flex items-center py-2.5 border-b border-stone-100 last:border-0"
                  >
                    {item.imageUrl ? (
                      <BlurImage
                        src={item.imageUrl}
                        width={400}
                        alt={item.name}
                        className="h-10 w-10 rounded-md shrink-0 mr-3 bg-stone-100"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-md bg-stone-100 flex items-center justify-center text-stone-300 shrink-0 mr-3">
                        <Utensils className="h-4 w-4" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-start gap-1.5">
                        <div className="mt-[3px] shrink-0">
                          {item.isVeg ? (
                            <div className="w-3 h-3 border border-green-600 flex items-center justify-center rounded-[2px]">
                              <div className="w-1.5 h-1.5 bg-green-600 rounded-full" />
                            </div>
                          ) : (
                            <div className="w-3 h-3 border border-red-600 flex items-center justify-center rounded-[2px]">
                              <div className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="text-[13px] font-bold text-stone-900 leading-tight">{item.name}</p>
                          <p className="text-[11px] font-medium text-stone-400 mt-0.5">
                            {formatCurrency(item.price, restaurant?.currency ?? '₹')} per unit
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      {item.itemId.startsWith('water-bottle-') ? (
                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full select-none">
                          Requested (Qty: {item.qty})
                        </span>
                      ) : (
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => removeFromCart(item.itemId)}
                            className="h-[26px] w-[26px] rounded-full bg-stone-100 flex items-center justify-center text-stone-600 hover:bg-stone-200 transition-colors"
                          >
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-3 text-center text-[13px] font-bold text-stone-900">{item.qty}</span>
                          <button
                            onClick={() => addToCart({ id: item.itemId, name: item.name, price: item.price, isVeg: item.isVeg, imageUrl: item.imageUrl, qty: 1 })}
                            className="h-[26px] w-[26px] rounded-full bg-[#1a1814] flex items-center justify-center text-white hover:bg-black transition-colors"
                          >
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                      <span className="text-[13px] font-bold text-stone-900 w-[45px] text-right">
                        {formatCurrency(item.price * item.qty, restaurant?.currency ?? '₹')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Special instructions + Customer name */}
              <div className="bg-white px-4 py-3 border-t border-stone-100 space-y-3 shrink-0">
                {!showSpecialRequest && !note ? (
                  <div>
                    <button
                      onClick={() => setShowSpecialRequest(true)}
                      className="text-[11px] font-bold text-[#c86214] hover:text-[#b05612] uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Special Request
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-[#6b6560] uppercase tracking-wide">Special Requests</label>
                      <button onClick={() => { setShowSpecialRequest(false); setNote(''); }} className="text-stone-400 hover:text-[#c86214] transition-colors p-1 -mr-1 rounded-full hover:bg-orange-50">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <input
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      placeholder="no spice"
                      autoFocus
                      className="w-full bg-white border border-stone-200 rounded-[6px] px-3 py-2 text-[13px] mt-0.5 focus:outline-none focus:border-[#c86214] focus:ring-1 focus:ring-[#c86214] text-stone-900"
                    />
                  </div>
                )}
                <div>
                  <label className="text-[10px] font-bold text-[#6b6560] uppercase tracking-wide">Your Name (Optional)</label>
                  <input
                    value={customerName}
                    onChange={e => setCustomerName(e.target.value)}
                    placeholder="Enter your name"
                    className="w-full bg-white border border-stone-200 rounded-[6px] px-3 py-2 text-[13px] mt-1.5 focus:outline-none focus:border-[#c86214] focus:ring-1 focus:ring-[#c86214] text-stone-900"
                  />
                </div>
              </div>

              {/* Bill Details & Place Order */}
              <div className="border-t border-stone-200 bg-white px-4 pt-3 pb-3 space-y-2 shrink-0">
                <div className="flex justify-between text-[13px] text-[#6b6560]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(cartTotal, restaurant?.currency ?? '₹')}</span>
                </div>
                <div className="flex justify-between text-[13px] text-[#6b6560]">
                  <span>CGST & SGST (5%)</span>
                  <span>{formatCurrency(cartTotal * 0.05, restaurant?.currency ?? '₹')}</span>
                </div>
                <div className="flex justify-between text-base font-bold text-[#1a1814] pt-2">
                  <span>Grand Total</span>
                  <span>{formatCurrency(cartTotal * 1.05, restaurant?.currency ?? '₹')}</span>
                </div>
                <div className="pt-3">
                  <button
                    onClick={placeOrder}
                    disabled={placing}
                    className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-lg shadow-amber-500/20 transition disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {placing && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== FLOATING CONTROLS (Cart + Nav) ===== */}
        {restaurant && (
          <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none flex flex-col justify-end max-w-[480px] mx-auto transition-all">
            
            {activeTab === 'menu' && !searchOpen && categories.length > 0 && (
              <div className="w-full flex justify-end px-5 mb-4 pointer-events-auto md:hidden">
                <button
                  onClick={() => setMobileMenuOpen(true)}
                  className="bg-stone-900 text-white w-14 h-14 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.25)] flex items-center justify-center border border-stone-700/50 hover:bg-stone-800 transition-colors active:scale-95 animate-[slideUp_0.3s_ease-out]"
                  aria-label="Menu"
                >
                  <Menu className="w-6 h-6" />
                </button>
              </div>
            )}

            {activeTab === 'menu' && cartCount > 0 && !cartOpen && (
              <div className="w-full animate-in">
                <button
                  onClick={() => setCartOpen(true)}
                  className="pointer-events-auto w-full bg-stone-900 hover:bg-stone-800 text-white rounded-t-2xl px-5 py-3.5 flex items-center justify-between shadow-[0_-8px_30px_rgba(0,0,0,0.15)] transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-8.5 w-8.5 rounded-xl bg-white/10 flex items-center justify-center">
                        <ShoppingBag className="h-4.5 w-4.5 text-white" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 h-5 min-w-5 px-1 rounded-full bg-amber-500 text-[9px] font-bold flex items-center justify-center">
                        {cartCount}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className="text-[10px] text-stone-400">Your order</p>
                      <p className="text-xs font-semibold">
                        {cartCount} {cartCount === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold">{formatCurrency(cartTotal, restaurant?.currency ?? '₹')}</p>
                    <div className="h-7 w-7 rounded-full bg-white/10 flex items-center justify-center">
                      <ChevronRight className="h-4 w-4 text-white" />
                    </div>
                  </div>
                </button>
              </div>
            )}

            <div className="pointer-events-auto bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-[0_-8px_30px_rgb(0,0,0,0.08)] w-full flex items-center justify-around pb-[env(safe-area-inset-bottom)]">
              <button
                onClick={() => setActiveTab('menu')}
                className={`flex flex-col items-center gap-1 py-3 px-6 transition-all ${activeTab === 'menu' ? 'text-[#d97706]' : 'text-stone-500 hover:text-stone-850'}`}
              >
                <Utensils className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-wide uppercase">Menu</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`flex flex-col items-center gap-1 py-3 px-6 relative transition-all ${activeTab === 'history' ? 'text-[#d97706]' : 'text-stone-500 hover:text-stone-850'}`}
              >
                <History className="w-5 h-5" />
                <span className="text-[10px] font-bold tracking-wide uppercase">My Orders</span>
                {activeOrders.length > 0 && (
                  <span className="absolute top-2.5 right-4 w-4 h-4 bg-amber-600 text-white text-[9px] rounded-full flex items-center justify-center font-bold border border-white animate-[pop_0.15s_ease-out]">
                    {activeOrders.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ===== MOBILE MENU BOTTOM SHEET ===== */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[70] flex justify-center items-end md:hidden">
            <div
              className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm transition-opacity"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div className="relative w-full max-h-[75dvh] bg-white shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              <div className="bg-white shrink-0 border-b border-stone-100 pt-3 pb-3">
                <div className="w-10 h-1.5 bg-stone-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between px-5">
                  <h3 className="text-xl font-bold text-stone-900 font-display">Menu Index</h3>
                  <button onClick={() => setMobileMenuOpen(false)} className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-2">
                <button
                  onClick={() => { scrollToCategory('all'); setMobileMenuOpen(false); }}
                  className={`w-full text-left py-4 border-b border-stone-100 font-bold text-sm flex justify-between items-center ${activeCategory === 'all' ? 'text-amber-600' : 'text-stone-700'}`}
                >
                  All Items
                  {activeCategory === 'all' && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                </button>
                {categories.map(cat => {
                  const isActive = activeCategory === cat.id;
                  const filteredCount = filteredItems.filter(i => i.categoryId === cat.id).length;
                  if (activeItems.filter(i => i.categoryId === cat.id).length === 0) return null;
                  
                  return (
                    <button
                      key={cat.id}
                      onClick={() => { scrollToCategory(cat.id); setMobileMenuOpen(false); }}
                      className={`w-full text-left py-4 border-b border-stone-100 font-bold text-sm flex justify-between items-center ${isActive ? 'text-amber-600' : 'text-stone-700'}`}
                    >
                      <span>{cat.name} <span className="opacity-50 ml-1.5 text-xs font-semibold">{filteredCount}</span></span>
                      {isActive && <div className="w-2 h-2 rounded-full bg-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== WATER REQUEST MODAL ===== */}
        {waterModalOpen && (
          <div className="fixed inset-0 z-[80] flex justify-center items-end">
            <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setWaterModalOpen(false)} />
            <div className="relative w-full max-h-[75dvh] max-w-[480px] bg-white shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              <div className="bg-white shrink-0 border-b border-stone-100 pt-3 pb-3">
                <div className="w-10 h-1.5 bg-stone-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between px-5">
                  <h3 className="text-xl font-bold text-stone-900 font-display flex items-center gap-2">
                    💧 Add Water Bottle
                  </h3>
                  <button onClick={() => setWaterModalOpen(false)} className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-5 py-4 flex-1 overflow-y-auto space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Select Option</p>
                  <div className="flex flex-col gap-2">
                    {waterOptions.map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setSelectedWaterOptId(opt.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all ${
                          selectedWaterOptId === opt.id ? 'border-blue-500 bg-blue-50' : 'border-stone-100 hover:border-stone-200'
                        }`}
                      >
                        <span className={`font-bold ${selectedWaterOptId === opt.id ? 'text-blue-700' : 'text-stone-800'}`}>{opt.ml} Water Bottle</span>
                        <span className={`font-semibold ${selectedWaterOptId === opt.id ? 'text-blue-600' : 'text-stone-500'}`}>{formatCurrency(opt.price, restaurant?.currency ?? '₹')}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2 pt-2 border-t border-stone-100">
                  <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Quantity</p>
                  <div className="flex items-center gap-4 bg-stone-50 border border-stone-200 rounded-2xl p-2 w-fit">
                    <button
                      onClick={() => setWaterQty(Math.max(1, waterQty - 1))}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 hover:bg-stone-100"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-bold text-lg text-stone-900">{waterQty}</span>
                    <button
                      onClick={() => setWaterQty(waterQty + 1)}
                      className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-stone-600 hover:bg-stone-100"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5 border-t border-stone-100 bg-white shrink-0">
                <button
                  onClick={async () => {
                    const opt = waterOptions.find(o => o.id === selectedWaterOptId);
                    if (!opt || !restaurant) return;
                    
                    let finalTable = tableNumber;
                    if (!finalTable) {
                      const inputTable = window.prompt("Enter your table number (or leave empty for Takeaway):");
                      if (inputTable === null) return;
                      finalTable = inputTable.trim() || 'Takeaway';
                      if (finalTable !== 'Takeaway') {
                        setTableNumber(finalTable);
                      }
                    }

                    try {
                      // 1. Send request to the restaurant owner/waiter
                      if (hasFirebase) {
                        await createWaterRequest(restaurant.id, finalTable, waterQty, 'water', opt.ml, opt.price);
                      }

                      // 2. Add to placed order (as extra item) or to the local cart
                      if (activeOrders.length > 0) {
                        // User has active placed order(s) -> add water as extra to the most recent active order
                        const activeOrder = activeOrders[0];
                        await addWaterAsExtra(activeOrder, opt, waterQty);
                      } else {
                        // No active orders yet -> add to the local cart
                        addToCart({
                          id: `water-bottle-${opt.id}`,
                          name: `Water Bottle (${opt.ml})`,
                          price: opt.price,
                          qty: waterQty,
                          isVeg: true,
                          imageUrl: ''
                        });
                        toast.success(`Request sent! Added ${waterQty}x Water Bottle (${opt.ml}) to cart.`);
                        setCartOpen(true);
                      }
                      
                      setWaterModalOpen(false);
                      setRequestCooldown(60);
                    } catch (err) {
                      console.error("Failed to request water:", err);
                      toast.error("Failed to send water request.");
                    }
                  }}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                >
                  Request Now
                  <span className="bg-white/20 px-2 py-0.5 rounded text-xs">
                    {formatCurrency((waterOptions.find(o => o.id === selectedWaterOptId)?.price ?? 0) * waterQty, restaurant?.currency ?? '₹')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===== ADD EXTRA ITEMS DRAWER ===== */}
        {selectedOrderForExtra && (
          <div className="fixed inset-0 z-[80] flex justify-center items-end">
            <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => !isUpdatingOrder && setSelectedOrderForExtra(null)} />
            <div className="relative w-full h-[85dvh] max-w-[480px] bg-stone-50 shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
              <div className="bg-white shrink-0 border-b border-stone-200 pt-3 pb-3">
                <div className="w-10 h-1.5 bg-stone-200 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between px-5 mb-3">
                  <div>
                    <h3 className="text-xl font-bold text-stone-900 font-display leading-tight">Add Extra Items</h3>
                    <p className="text-xs text-stone-500 font-medium">To Order #{selectedOrderForExtra.id.slice(0, 8)}</p>
                  </div>
                  <button 
                    onClick={() => !isUpdatingOrder && setSelectedOrderForExtra(null)} 
                    disabled={isUpdatingOrder}
                    className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Search Bar for Extra Items */}
                <div className="px-5">
                  <div className="relative flex-1 rounded-xl bg-stone-100 border border-stone-200 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-400/20 transition-all">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      value={extraSearchQuery}
                      onChange={e => setExtraSearchQuery(e.target.value)}
                      placeholder="Search for extra items..."
                      className="w-full bg-transparent rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none text-stone-900 placeholder:text-stone-400"
                    />
                    {extraSearchQuery && (
                      <button onClick={() => setExtraSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600">
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-stone-50">
                {activeItems
                  .filter(i => extraSearchQuery ? i.name.toLowerCase().includes(extraSearchQuery.toLowerCase()) : true)
                  .map(item => {
                    if (item.isCombo && item.comboPrices && item.comboPrices.length > 0) {
                      return item.comboPrices.map(cp => {
                        const comboId = `${item.id}-combo-${cp.persons}p`;
                        const currentQty = extraItemsCart[comboId] || 0;
                        return (
                          <div key={comboId} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-xl shadow-sm">
                            <div className="flex items-start gap-2 pr-2">
                              <span className={`mt-1 w-2.5 h-2.5 rounded-sm shrink-0 border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                <span className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                              </span>
                              <div>
                                <p className="font-bold text-sm text-stone-900 leading-tight">{item.name} <span className="text-stone-500 font-medium">({cp.persons} Pax)</span></p>
                                <p className="text-xs font-semibold text-stone-500 mt-0.5">{formatCurrency(cp.price, restaurant?.currency ?? '₹')}</p>
                              </div>
                            </div>
                            {currentQty === 0 ? (
                              <button
                                onClick={() => setExtraItemsCart(prev => ({ ...prev, [comboId]: 1 }))}
                                className="px-4 py-1.5 rounded-full border border-stone-300 text-stone-850 hover:bg-stone-50 font-bold text-xs shrink-0"
                              >
                                + Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-full px-2 py-1 shrink-0">
                                <button
                                  onClick={() => setExtraItemsCart(prev => ({ ...prev, [comboId]: prev[comboId] - 1 }))}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-stone-800 text-xs min-w-[16px] text-center">{currentQty}</span>
                                <button
                                  onClick={() => setExtraItemsCart(prev => ({ ...prev, [comboId]: prev[comboId] + 1 }))}
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-stone-800 hover:bg-stone-200"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    } else {
                      const currentQty = extraItemsCart[item.id] || 0;
                      return (
                        <div key={item.id} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-xl shadow-sm">
                          <div className="flex items-start gap-2 pr-2">
                            <span className={`mt-1 w-2.5 h-2.5 rounded-sm shrink-0 border flex items-center justify-center ${item.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                              <span className={`w-1 h-1 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                            </span>
                            <div>
                              <p className="font-bold text-sm text-stone-900 leading-tight">{item.name}</p>
                              <p className="text-xs font-semibold text-stone-500 mt-0.5">{formatCurrency(item.price, restaurant?.currency ?? '₹')}</p>
                            </div>
                          </div>
                          {currentQty === 0 ? (
                            <button
                              onClick={() => setExtraItemsCart(prev => ({ ...prev, [item.id]: 1 }))}
                              className="px-4 py-1.5 rounded-full border border-stone-300 text-stone-850 hover:bg-stone-50 font-bold text-xs shrink-0"
                            >
                              + Add
                            </button>
                          ) : (
                            <div className="flex items-center gap-3 bg-stone-50 border border-stone-200 rounded-full px-2 py-1 shrink-0">
                              <button
                                onClick={() => setExtraItemsCart(prev => ({ ...prev, [item.id]: prev[item.id] - 1 }))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-bold text-stone-800 text-xs min-w-[16px] text-center">{currentQty}</span>
                              <button
                                onClick={() => setExtraItemsCart(prev => ({ ...prev, [item.id]: prev[item.id] + 1 }))}
                                className="w-6 h-6 rounded-full flex items-center justify-center text-stone-800 hover:bg-stone-200"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}
              </div>

              <div className="p-4 border-t border-stone-200 bg-white shrink-0">
                <button
                  onClick={handleAddExtraItemsToOrder}
                  disabled={isUpdatingOrder || Object.values(extraItemsCart).every(q => q === 0)}
                  className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isUpdatingOrder && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Extra Items
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp { 
          from { transform: translateY(100%); } 
          to { transform: translateY(0); } 
        }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}

/* ===== ITEM CARD COMPONENT ===== */
const ItemCard = memo(function ItemCard({
  item,
  qty,
  onAdd,
  onRemove,
  currency,
}: {
  item: MenuItem;
  qty: number;
  onAdd: (i: MenuItem) => void;
  onRemove: (id: string) => void;
  currency: string;
}) {
  const isTop = isItemTopRated(item);
  const cart = useCartStore(state => state.cart);
  const addToCart = useCartStore(state => state.addToCart);
  const removeFromCart = useCartStore(state => state.removeFromCart);

  return (
    <article className={`bg-white rounded-xl border border-stone-200 p-3 flex gap-3 text-left ${!item.isAvailable ? 'opacity-65' : ''}`}>
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {item.isVeg ? (
              <div className="flex items-center justify-center w-3.5 h-3.5 border border-green-600 rounded-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
              </div>
            ) : (
              <div className="flex items-center justify-center w-3.5 h-3.5 border border-red-600 rounded-sm">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600" />
              </div>
            )}
            {isTop && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200">
                <Star className="w-2 h-2 fill-amber-500 text-amber-500" /> Signature
              </span>
            )}
          </div>
          <h3 className="text-base font-bold text-stone-900 leading-tight mb-1">{item.name}</h3>
          {!item.isCombo && (
            <p className="text-sm font-semibold text-stone-900 mb-1">{formatCurrency(item.price, currency)}</p>
          )}
          {item.description && (
            <p className="text-xs text-stone-500 leading-snug line-clamp-2">{item.description}</p>
          )}

          {item.isCombo && item.comboPrices && item.comboPrices.length > 0 && (
            <div className="mt-2.5 space-y-2 border-t border-stone-100 pt-2.5">
              {item.comboPrices.map((cp) => {
                const comboOptionId = `${item.id}-combo-${cp.persons}p`;
                const optionQty = cart.find(c => c.itemId === comboOptionId)?.qty ?? 0;

                const handleAddOption = () => {
                  addToCart({
                    id: comboOptionId,
                    name: `${item.name} (${cp.persons} Person${cp.persons > 1 ? 's' : ''})`,
                    price: cp.price,
                    isVeg: item.isVeg,
                    imageUrl: item.imageUrl,
                    qty: 1
                  });
                };

                const handleRemoveOption = () => {
                  removeFromCart(comboOptionId);
                };

                return (
                  <div key={cp.persons} className="flex items-center justify-between text-xs py-1">
                    <span className="font-medium text-stone-700">
                      {cp.persons} Pax <span className="text-stone-400 font-normal">({formatCurrency(cp.price, currency)})</span>
                    </span>
                    {optionQty === 0 ? (
                      <button
                        onClick={handleAddOption}
                        disabled={!item.isAvailable}
                        className="px-3 py-1 rounded-full border border-stone-300 text-stone-850 hover:bg-stone-50 font-bold transition-all text-[11px] disabled:opacity-50"
                      >
                        + Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-full px-1.5 py-0.5">
                        <button
                          onClick={handleRemoveOption}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-stone-600 hover:bg-stone-200"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-stone-800 text-[11px] min-w-[12px] text-center">{optionQty}</span>
                        <button
                          onClick={handleAddOption}
                          disabled={!item.isAvailable}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-stone-800 hover:bg-stone-200 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <div className="w-[110px] shrink-0 flex flex-col items-center justify-center">
        <div className="w-full aspect-square rounded-xl bg-stone-100 overflow-hidden relative mb-2 shadow-sm border border-stone-100">
          {item.imageUrl ? (
            <BlurImage src={item.imageUrl} width={200} alt={item.name} className="w-full h-full" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-stone-300">
              <Utensils className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="w-full -mt-6 relative z-10">
          {item.isCombo ? null : (!item.isAvailable ? (
            <div className="w-full py-1.5 bg-stone-100 rounded-full text-center border border-stone-200 shadow-sm">
              <span className="text-[10px] font-bold text-stone-400">Sold out</span>
            </div>
          ) : qty === 0 ? (
            <button
              onClick={() => onAdd(item)}
              className="w-full py-2 rounded-full bg-stone-900 border border-stone-900 text-white text-xs font-bold shadow-md flex items-center justify-center gap-1 hover:bg-stone-800 uppercase tracking-wide transition-colors min-h-[40px]"
            >
              Add
              <Plus className="w-3 h-3" />
            </button>
          ) : (
            <div className="w-full flex items-center justify-between bg-white border border-stone-900 rounded-full p-1 shadow-md min-h-[40px]">
              <button
                onClick={() => onRemove(item.id)}
                className="w-9 h-9 rounded-full bg-stone-100 flex items-center justify-center text-stone-800 hover:bg-stone-200 transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="text-sm font-bold text-stone-900 w-6 text-center">{qty}</span>
              <button
                onClick={() => onAdd(item)}
                className="w-9 h-9 rounded-full bg-stone-900 flex items-center justify-center text-white hover:bg-stone-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
});;

/* ===== SKELETON COMPONENT ===== */
function ItemCardSkeleton() {
  return (
    <article className="bg-white rounded-xl border border-stone-100 p-3 flex gap-3 animate-pulse shadow-sm">
      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="w-16 h-4 bg-stone-200 rounded mb-2.5" />
          <div className="w-3/4 h-5 bg-stone-200 rounded mb-2.5" />
          <div className="w-1/4 h-4 bg-stone-200 rounded mb-3" />
          <div className="w-full h-2.5 bg-stone-100 rounded mb-1.5" />
          <div className="w-5/6 h-2.5 bg-stone-100 rounded" />
        </div>
      </div>
      <div className="w-[110px] shrink-0 flex flex-col items-center">
        <div className="w-full aspect-square rounded-xl bg-stone-200 mb-2" />
        <div className="w-full h-10 bg-stone-200 rounded-full -mt-6 relative z-10 border-2 border-white" />
      </div>
    </article>
  );
}
