import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, AlertTriangle, ArrowLeft, Smartphone, QrCode, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';

interface SessionData {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  items: Array<{ name: string; price: number; qty: number }>;
  totalAmount: number;
  upiId: string;
  status: 'pending_payment' | 'paid';
  orderId: string;
  expiresAt: Timestamp;
}

export default function PayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<SessionData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [updating, setUpdating] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const [restaurantPhone, setRestaurantPhone] = useState('');

  useEffect(() => {
    if (!sessionId) return;

    async function fetchSession() {
      try {
        const docRef = doc(db, 'sessions', sessionId!);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as SessionData;
          setSession(data);

          // Fetch restaurant phone for WhatsApp
          try {
            const restDoc = await getDoc(doc(db, 'restaurants', data.restaurantId));
            if (restDoc.exists()) {
              setRestaurantPhone((restDoc.data() as any).phone || '');
            }
          } catch (e) {
            console.error('Failed to fetch restaurant phone:', e);
          }
          
          // Check expiration
          const now = Timestamp.now();
          if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
            setIsExpired(true);
          } else {
            // Generate UPI Link
            // Format: upi://pay?pa=merchant@upi&pn=Name&am=10.00&tn=Order-Ref&cu=INR
            const cleanName = encodeURIComponent(data.restaurantName || 'Restaurant');
            const upiLink = `upi://pay?pa=${data.upiId}&pn=${cleanName}&am=${data.totalAmount}&tn=Order-${sessionId!.slice(0, 8)}&cu=INR`;
            
            // Generate QR Code URL
            const url = await QRCode.toDataURL(upiLink, {
              margin: 1,
              width: 256,
              color: {
                dark: '#1A1814',
                light: '#FAFAF8',
              }
            });
            setQrCodeUrl(url);
          }
        } else {
          setSession(null);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
        toast.error('Failed to load payment details.');
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [sessionId]);

  async function handleConfirmPayment() {
    if (!session || !sessionId) return;
    setUpdating(true);
    try {
      // Update session status to paid
      await updateDoc(doc(db, 'sessions', sessionId), {
        status: 'paid'
      });

      // Update permanent order record
      await updateDoc(doc(db, `restaurants/${session.restaurantId}/orders`, session.orderId), {
        paymentStatus: 'paid'
      });

      setSession(prev => prev ? { ...prev, status: 'paid' } : null);
      toast.success('Payment status updated successfully!');
      
      // Redirect to rating page or thank you
      setTimeout(() => {
        navigate(`/${session.restaurantSlug}/rate/${session.orderId}`);
      }, 2000);
    } catch (err) {
      console.error('Error updating payment:', err);
      toast.error('Failed to confirm payment. Please try again.');
    } finally {
      setUpdating(false);
    }
  }

  const upiLink = session ? `upi://pay?pa=${session.upiId}&pn=${encodeURIComponent(session.restaurantName)}&am=${session.totalAmount}&tn=Order-${sessionId!.slice(0, 8)}&cu=INR` : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center font-ui">
        <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-warm-600 text-sm">Securing payment connection...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center font-ui">
        <AlertTriangle className="w-14 h-14 text-amber-500 mb-4" />
        <h1 className="font-display font-bold text-xl text-warm-900">Payment session not found</h1>
        <p className="text-warm-600 text-sm mt-2 max-w-xs">The link may have expired or is incorrect. Please request a new payment link from the restaurant.</p>
        <button onClick={() => navigate(-1)} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:text-brand-500">
          <ArrowLeft className="w-4 h-4" /> Go back
        </button>
      </div>
    );
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center font-ui">
        <AlertTriangle className="w-14 h-14 text-red-500 mb-4" />
        <h1 className="font-display font-bold text-xl text-warm-900">Session expired</h1>
        <p className="text-warm-600 text-sm mt-2 max-w-xs">For security reasons, UPI checkout links expire after 30 minutes. Please scan the QR code at your table to order again.</p>
        <button onClick={() => navigate(`/${session.restaurantSlug}`)} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:text-brand-500">
          <ArrowLeft className="w-4 h-4" /> Return to Menu
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-warm-50 font-ui text-warm-800 pb-12">
      <div className="max-w-[480px] mx-auto bg-white min-h-screen relative p-5 flex flex-col justify-between">
        
        {/* Top brand header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(`/${session.restaurantSlug}`)} 
              className="w-8 h-8 rounded-full bg-warm-100 flex items-center justify-center text-warm-800"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-brand-500 font-bold uppercase tracking-wider">UPI Secure Checkout</span>
              <h2 className="font-display font-bold text-lg text-warm-900 leading-tight">{session.restaurantName}</h2>
            </div>
          </div>

          <div className="h-[1px] bg-warm-200" />
          
          {session.status === 'paid' ? (
            /* Thank you/Success Screen */
            <div className="py-12 px-4 text-center space-y-5 animate-pop-in">
              <div className="w-16 h-16 bg-[#F0F7F0] text-[#2D7A3A] rounded-full flex items-center justify-center mx-auto shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h3 className="font-display font-bold text-2xl text-warm-900">Payment Confirmed</h3>
                <p className="text-warm-600 text-sm">Your order from Table {session.tableNumber} is marked paid. The kitchen has begun preparing your delicious food!</p>
              </div>
              
              <div className="bg-warm-50 border border-warm-200 rounded-xl p-4 text-left max-w-sm mx-auto">
                <p className="text-[11px] font-semibold text-warm-600 uppercase tracking-wider">Order Summary</p>
                <div className="mt-2 divide-y divide-warm-200 text-xs">
                  {session.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between py-1.5">
                      <span className="text-warm-800">{item.name} <span className="text-warm-600">x{item.qty}</span></span>
                      <span className="font-semibold text-warm-900">{formatCurrency(item.price * item.qty, '₹')}</span>
                    </div>
                  ))}
                  <div className="flex justify-between pt-2 mt-1 font-bold text-sm text-warm-900">
                    <span>Total Amount</span>
                    <span>{formatCurrency(session.totalAmount, '₹')}</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => navigate(`/${session.restaurantSlug}/rate/${session.orderId}`)}
                className="w-full bg-brand-900 text-white font-semibold py-3.5 rounded-xl shadow-md hover:bg-brand-900/95 transition-all"
              >
                Rate Your Experience
              </button>
            </div>
          ) : (
            /* Active Payment Screen */
            <div className="space-y-6 text-center animate-slide-up">
              <div className="space-y-1">
                <p className="text-[11px] text-warm-600 uppercase font-semibold tracking-widest">Table {session.tableNumber} · Total Amount</p>
                <h1 className="font-sans font-black text-5xl tracking-tight text-warm-900">{formatCurrency(session.totalAmount, '₹')}</h1>
              </div>

              {/* QR Code Container */}
              <div className="bg-warm-50 border border-warm-200 rounded-2xl p-6 max-w-xs mx-auto shadow-sm relative">
                {qrCodeUrl ? (
                  <img src={qrCodeUrl} alt="UPI QR Code" className="w-full h-auto mx-auto rounded-lg" />
                ) : (
                  <div className="w-48 h-48 bg-warm-100 rounded-lg animate-pulse mx-auto" />
                )}
                
                {/* Micro-instructions */}
                <p className="text-[10px] text-warm-600 mt-4 leading-relaxed font-semibold flex items-center justify-center gap-1 uppercase tracking-wider">
                  <QrCode className="w-3.5 h-3.5 text-brand-500" /> Scan QR to Pay via GPay / PhonePe / Paytm
                </p>
              </div>

              {/* Mobile Deep Link Button */}
              <div className="space-y-3.5">
                <a
                  href={upiLink}
                  className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 text-sm transition-all transform active:scale-98"
                >
                  <Smartphone className="w-4 h-4" /> Pay directly via UPI Apps
                </a>
                
                <p className="text-[10px] text-warm-600 leading-normal max-w-xs mx-auto">
                  Clicking the button will open GPay, PhonePe, Paytm, or BHIM directly on your mobile device.
                </p>
              </div>

              {/* Step checklist */}
              <div className="h-[1px] bg-warm-200" />
              
              <div className="text-left space-y-3 px-2">
                <h4 className="text-[11px] font-semibold text-warm-600 uppercase tracking-widest">Payment Steps</h4>
                <ol className="text-xs text-warm-800 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                  <li>Scan the QR code or click the direct payment button above.</li>
                  <li>Enter your UPI PIN to secure the transaction in your bank app.</li>
                  <li>Return to this page and tap the <strong>"I confirm I have paid"</strong> button below to finalize your order.</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {session.status !== 'paid' && (
          <div className="space-y-4 pt-6 mt-8">
            <button
              onClick={handleConfirmPayment}
              disabled={updating}
              className="w-full bg-brand-900 hover:bg-brand-900/90 text-white font-semibold py-3.5 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-sm shadow-md"
            >
              {updating ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              I confirm I have paid
            </button>
            
            <div className="flex items-center justify-center gap-1.5 text-warm-600">
              <ShieldCheck className="w-4 h-4 text-[#2D7A3A]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Secure Peer-to-Peer UPI Transfer</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
