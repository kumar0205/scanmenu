import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, Utensils, ReceiptText, ChefHat } from 'lucide-react';
import { useRestaurant } from '../../hooks/useRestaurant';

export default function OrderSuccessPage() {
  const { restaurantSlug, orderId } = useParams<{ restaurantSlug: string; orderId: string }>();
  const { restaurant, loading } = useRestaurant(restaurantSlug);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const getMenuUrl = (tab?: string) => {
    const table = localStorage.getItem('scanmenu_last_table');
    const token = localStorage.getItem('scanmenu_last_token');
    const params = new URLSearchParams();
    if (tab) params.set('tab', tab);
    if (table) params.set('table', table);
    if (token) params.set('p', token);
    const queryString = params.toString();
    return `/${restaurantSlug}${queryString ? `?${queryString}` : ''}`;
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl shadow-stone-200/50 border border-stone-100 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-stone-200 animate-pulse mb-8" />
          <div className="h-8 w-48 bg-stone-200 rounded animate-pulse mb-4" />
          <div className="h-4 w-64 bg-stone-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-56 bg-stone-200 rounded animate-pulse mb-8" />
          <div className="w-full h-20 bg-stone-100 rounded-2xl mb-8 animate-pulse" />
          <div className="w-full h-14 bg-stone-200 rounded-xl mb-3 animate-pulse" />
          <div className="w-full h-14 bg-stone-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className={`w-full max-w-md bg-white rounded-[32px] p-8 shadow-2xl shadow-stone-200/50 border border-stone-100 transform transition-all duration-700 ease-out ${mounted ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'}`}>
        
        {/* Animated Check Icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className={`absolute inset-0 bg-green-100 rounded-full scale-100 transition-transform duration-1000 ${mounted ? 'animate-[pulse_2s_ease-in-out_infinite]' : ''}`} />
          <div className="absolute inset-0 flex items-center justify-center text-green-500">
            <CheckCircle2 className="w-12 h-12" strokeWidth={2.5} />
          </div>
        </div>
        
        <h1 className="text-3xl font-extrabold text-stone-900 font-display mb-3 tracking-tight">
          Order Received!
        </h1>
        
        <p className="text-stone-500 mb-8 text-[15px] leading-relaxed">
          Your order <span className="font-bold text-stone-900 bg-stone-100 px-2 py-0.5 rounded-md">#{orderId?.slice(0, 8)}</span> has been sent to the kitchen at <span className="font-bold text-stone-900">{restaurant?.name}</span>.
        </p>

        <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-8 flex items-center justify-center gap-4">
          <ChefHat className="w-8 h-8 text-amber-500" />
          <div className="text-left">
            <p className="text-sm font-bold text-stone-900">Preparing your food</p>
            <p className="text-xs text-stone-500 mt-0.5">We'll notify you when it's ready.</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <Link 
            to={getMenuUrl('history')} 
            className="w-full py-4 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/25 active:scale-[0.98]"
          >
            <ReceiptText className="w-5 h-5" />
            Track Order Status
          </Link>
          
          <Link 
            to={getMenuUrl()} 
            className="w-full py-4 px-4 bg-white border-2 border-stone-100 hover:bg-stone-50 text-stone-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
          >
            <Utensils className="w-5 h-5" />
            Back to Menu
          </Link>
        </div>
      </div>
    </div>
  );
}
