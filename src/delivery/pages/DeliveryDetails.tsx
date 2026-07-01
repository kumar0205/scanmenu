import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { getRestaurantDetails, updateDeliveryStatus } from '../firebase/riderDb';
import { Timeline as OrderTimeline } from '../components/Timeline';
import type { Order } from '../../types';
import type { DeliveryBoy } from '../types';
import { formatCurrency } from '../../utils/formatters';
import { 
  ArrowLeft, Phone, CheckCircle, Navigation, Loader2, 
  ShoppingBag, MessageSquare, ExternalLink 
} from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

interface DeliveryDetailsProps {
  profile: DeliveryBoy | null;
  myOrders: Order[];
  currency: string;
}

export default function DeliveryDetails({ profile, myOrders, currency }: DeliveryDetailsProps) {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const locationState = useLocation().state as { restaurantId?: string } | undefined;
  
  const [restaurant, setRestaurant] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'cash' | 'upi'>('cash');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  const order = myOrders.find(o => o.id === orderId);
  const restaurantId = orderId ? (order as any)?.restaurantId || (locationState?.restaurantId || '') : '';

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurantDetails(restaurantId)
      .then(res => {
        if (res) setRestaurant(res);
      })
      .catch(err => console.error('Error fetching restaurant details:', err));
  }, [restaurantId]);

  useEffect(() => {
    if (!profile?.upiId || !order) {
      setQrCodeUrl('');
      return;
    }

    const cleanName = encodeURIComponent(profile.name || 'Rider');
    const upiLink = `upi://pay?pa=${profile.upiId}&pn=${cleanName}&cu=INR`;

    QRCode.toDataURL(upiLink, { margin: 1, width: 220 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error('Error generating Rider UPI QR code:', err));
  }, [profile, order]);

  if (!profile) return null;

  if (!order) {
    return (
      <div className="text-center py-20 text-premium-muted space-y-4 text-left">
        <p>Order details not found or you do not have permission to view it.</p>
        <button 
          onClick={() => navigate('/admin/rider')}
          className="text-xs font-bold text-premium-primary border border-premium-primary/30 px-4 py-2 rounded-xl"
        >
          Back to Portal
        </button>
      </div>
    );
  }

  const itemsCount = order.items.reduce((sum, item) => sum + item.qty, 0);
  
  async function handleStatusTransition() {
    if (!restaurantId || !order || !profile) return;
    
    setUpdating(true);
    const nextStatus = order.status === 'ready' ? 'out_for_delivery' : 'delivered';
    
    try {
      await updateDeliveryStatus(
        restaurantId, 
        order.id, 
        nextStatus, 
        profile.uid, 
        order.deliveryFee || 0,
        nextStatus === 'delivered' ? paymentMode : undefined
      );
      toast.success(nextStatus === 'out_for_delivery' ? 'Status updated: Out for Delivery!' : 'Delivery completed successfully!');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to update status');
    } finally {
      setUpdating(false);
    }
  }

  function handleGoogleMapsRedirect() {
    if (!order?.address) return;
    const q = `${order.address.address}, ${order.address.street || ''}, ${order.address.town}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`, '_blank');
  }

  return (
    <div className="space-y-5 text-left text-premium-text">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-xl bg-premium-card border border-premium-border text-premium-text hover:bg-premium-hover transition"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="text-lg font-extrabold text-premium-text">Order Details</h2>
          <p className="text-[10px] text-premium-muted font-mono mt-0.5">ID: {order.id}</p>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="bg-premium-card border border-premium-border rounded-[16px] p-5 space-y-4 shadow-premium">
        
        {/* Restaurant Block */}
        <div className="flex items-center justify-between border-b border-premium-border/40 pb-4">
          <div className="flex items-center gap-3">
            {restaurant?.logoUrl ? (
              <img 
                src={restaurant.logoUrl} 
                alt={restaurant.name} 
                className="w-12 h-12 rounded-xl object-cover border border-premium-border"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-premium-bg border border-premium-border flex items-center justify-center text-premium-muted">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            <div>
              <span className="text-[9px] text-premium-muted font-bold uppercase tracking-wider block">Pickup Restaurant</span>
              <h3 className="text-premium-text font-extrabold text-sm mt-0.5">{restaurant?.name || 'Loading...'}</h3>
              <p className="text-[10px] text-premium-muted/80 font-medium mt-0.5">{restaurant?.address}</p>
            </div>
          </div>
          
          {restaurant?.phone && (
            <a 
              href={`tel:${restaurant.phone}`}
              className="p-2.5 rounded-xl bg-premium-bg border border-premium-border text-premium-text hover:text-premium-primary hover:border-premium-primary/40 transition"
              title="Call Restaurant"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Customer Block */}
        {order.address && (
          <div className="space-y-3 pb-2 border-b border-premium-border/40">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[9px] text-premium-primary font-bold uppercase tracking-wider block">Deliver To</span>
                <h4 className="text-premium-text font-extrabold text-sm mt-0.5">{order.address.name}</h4>
                <p className="text-[11px] text-premium-muted leading-relaxed mt-1 font-semibold">{order.address.address}, {order.address.street}</p>
                {order.address.landmark && (
                  <p className="text-[10px] text-premium-warning font-semibold italic mt-0.5">Landmark: {order.address.landmark}</p>
                )}
                <p className="text-[11px] text-premium-muted mt-0.5 font-semibold">{order.address.town}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleGoogleMapsRedirect}
                  className="p-2.5 rounded-xl bg-premium-bg border border-premium-border text-premium-text hover:text-premium-primary hover:border-premium-primary/40 transition"
                  title="View on Google Maps"
                >
                  <ExternalLink className="w-4 h-4" />
                </button>
                <a 
                  href={`tel:${order.address.phone}`}
                  className="p-2.5 rounded-xl bg-premium-success/15 border border-premium-success/30 text-premium-success hover:bg-premium-success/25 transition"
                  title="Call Customer"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-2 border-b border-premium-border/40 pb-4">
          <h4 className="text-premium-text font-extrabold text-xs uppercase tracking-wider">Order Items ({itemsCount})</h4>
          <div className="bg-premium-bg border border-premium-border/40 rounded-xl p-3.5 space-y-2">
            {order.items.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-sm shrink-0 ${item.isVeg ? 'bg-premium-success' : 'bg-premium-danger'}`} />
                  <span className="text-premium-text font-bold">{item.qty}x {item.name}</span>
                </div>
                <span className="text-premium-muted font-bold font-mono">{currency}{item.price * item.qty}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        {order.note && (
          <div className="bg-premium-warning/5 border border-premium-warning/15 rounded-xl p-3.5 text-xs flex gap-2.5 items-start">
            <MessageSquare className="w-4 h-4 text-premium-warning shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-premium-warning font-bold block">Delivery Notes</span>
              <p className="text-premium-muted font-mono leading-relaxed truncate max-w-[280px]">{order.note}</p>
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="space-y-2 text-xs">
          <div className="flex justify-between font-semibold">
            <span className="text-premium-muted">Order Subtotal</span>
            <span className="text-premium-text font-bold font-mono">{currency}{order.subtotal ?? (order.totalAmount - (order.deliveryFee || 0) - (order.platformFee || 0) - (order.taxes || 0))}</span>
          </div>
          {order.taxes !== undefined && order.taxes > 0 && (
            <div className="flex justify-between font-semibold">
              <span className="text-premium-muted">Taxes (CGST + SGST)</span>
              <span className="text-premium-text font-bold font-mono">{currency}{order.taxes}</span>
            </div>
          )}
          {order.platformFee !== undefined && order.platformFee > 0 && (
            <div className="flex justify-between font-semibold">
              <span className="text-premium-muted">Platform Fee</span>
              <span className="text-premium-text font-bold font-mono">{currency}{order.platformFee}</span>
            </div>
          )}
          {order.deliveryFee !== undefined && order.deliveryFee > 0 && (
            <div className="flex justify-between font-semibold">
              <span className="text-premium-muted">Delivery Fee</span>
              <span className="text-premium-text font-bold font-mono">{currency}{order.deliveryFee}</span>
            </div>
          )}
          <div className="flex justify-between text-sm font-extrabold text-premium-text pt-2.5 border-t border-premium-border/40">
            <span>Grand Total</span>
            <span className="text-premium-success font-mono text-base">{formatCurrency(order.totalAmount, currency)}</span>
          </div>
        </div>
      </div>

      {/* Payment Collection Section (only when out_for_delivery) */}
      {order.status === 'out_for_delivery' && (
        <div className="bg-premium-card border border-premium-border rounded-[16px] p-5 space-y-4 text-center shadow-premium">
          <div className="text-left border-b border-premium-border/40 pb-3">
            <h4 className="text-premium-text font-extrabold text-xs uppercase tracking-wider">Collect Payment</h4>
            <p className="text-[10px] text-premium-muted mt-0.5">Choose how the customer paid for their delivery.</p>
          </div>

          {/* Payment Mode Selector Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMode('cash')}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                paymentMode === 'cash'
                  ? 'bg-premium-success/15 border-premium-success text-premium-success font-extrabold'
                  : 'bg-premium-bg border-premium-border text-premium-muted hover:text-premium-text'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${paymentMode === 'cash' ? 'bg-premium-success' : 'bg-transparent border border-premium-muted/50'}`} />
              Cash Payment
            </button>
            <button
              onClick={() => setPaymentMode('upi')}
              className={`py-3.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition ${
                paymentMode === 'upi'
                  ? 'bg-premium-success/15 border-premium-success text-premium-success font-extrabold'
                  : 'bg-premium-bg border-premium-border text-premium-muted hover:text-premium-text'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${paymentMode === 'upi' ? 'bg-premium-success' : 'bg-transparent border border-premium-muted/50'}`} />
              UPI Payment
            </button>
          </div>

          {/* UPI QR Display */}
          {paymentMode === 'upi' && (
            <div className="bg-premium-bg border border-premium-border/40 rounded-xl p-5 flex flex-col items-center justify-center gap-3.5 animate-fadeIn">
              {profile?.upiId ? (
                <>
                  <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-md">
                    {qrCodeUrl ? (
                      <img src={qrCodeUrl} alt="UPI QR Code" className="w-[180px] h-[180px] object-contain" />
                    ) : (
                      <div className="w-[180px] h-[180px] flex items-center justify-center text-gray-400">
                        <Loader2 className="w-6 h-6 animate-spin text-green-500" />
                      </div>
                    )}
                  </div>
                  <div className="text-center space-y-1">
                    <span className="text-[10px] text-premium-success font-extrabold tracking-wider uppercase block">Scan to Pay Rider</span>
                    <p className="text-xs font-bold text-premium-text font-mono">{profile.upiId}</p>
                    <p className="text-[10px] text-premium-muted">UPI account of {profile.name}</p>
                  </div>
                </>
              ) : (
                <div className="text-center py-4 space-y-1.5">
                  <p className="text-premium-warning font-bold text-xs">UPI Details Not Set</p>
                  <p className="text-[10px] text-premium-muted max-w-[240px] leading-relaxed mx-auto">
                    You haven't configured a UPI ID in your profile settings. Please edit your profile to add your UPI ID.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Timeline Section */}
      <OrderTimeline order={order} />

      {/* Delivery actions button at bottom */}
      {order.status !== 'delivered' && order.status !== 'completed' && order.status !== 'cancelled' && (
        <button
          onClick={handleStatusTransition}
          disabled={updating}
          className="w-full bg-premium-success hover:bg-green-600 disabled:opacity-50 text-premium-bg font-extrabold py-4 rounded-2xl transition flex items-center justify-center gap-2 text-sm shadow-premium min-h-[48px]"
        >
          {updating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : order.status === 'ready' ? (
            <>
              <Navigation className="w-5 h-5" /> Confirm Pickup & Start Delivery
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" /> Paid & Delivered
            </>
          )}
        </button>
      )}
    </div>
  );
}
