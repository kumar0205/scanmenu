import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, Timestamp, writeBatch } from 'firebase/firestore';
import { db, auth } from '../../firebase/config';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { formatCurrency } from '../../utils/formatters';
import { CheckCircle2, AlertTriangle, ArrowLeft, Smartphone, QrCode, ShieldCheck, Star, Gift, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import { useRestaurant } from '../../hooks/useRestaurant';
import { getOrder, submitRating, updateOrder } from '../../firebase/db';

interface SessionData {
  restaurantId: string;
  restaurantName: string;
  restaurantSlug: string;
  tableNumber: string;
  customerName: string;
  items: Array<{ name: string; price: number; qty: number }>;
  totalAmount: number;
  upiId: string;
  upiType?: 'merchant' | 'personal';
  customerId?: string;
  status: 'pending_payment' | 'paid';
  userConfirmedPayment?: boolean;
  orderId: string;
  expiresAt: Timestamp;
}

export default function PayPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const getMenuUrl = () => {
    if (!session) return '/';
    const table = localStorage.getItem('scanmenu_last_table');
    const token = localStorage.getItem('scanmenu_last_token');
    const params = new URLSearchParams();
    if (table) params.set('table', table);
    if (token) params.set('p', token);
    const queryString = params.toString();
    return `/${session.restaurantSlug}${queryString ? `?${queryString}` : ''}`;
  };
  const [session, setSession] = useState<SessionData | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  // Hardcoded standard UPI payment

  const { restaurant } = useRestaurant(session?.restaurantSlug);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [reward, setReward] = useState<'discount' | 'dessert' | null>(null);
  const [submittedRating, setSubmittedRating] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const qrGeneratedRef = useRef(false);

  const [authInitialized, setAuthInitialized] = useState(false);
  const [currentUserUid, setCurrentUserUid] = useState<string | null>(null);
  const isDifferentUser = authInitialized && session?.customerId && currentUserUid && session.customerId !== currentUserUid;

  async function handleConfirmPayment() {
    if (!session || !sessionId) return;
    setConfirmingPayment(true);
    try {
      let currentUid = auth.currentUser?.uid;
      if (!currentUid) {
        const userCred = await signInAnonymously(auth);
        currentUid = userCred.user.uid;
      }
      if (session.customerId && session.customerId !== currentUid) {
        toast.error('Device mismatch: Please use the original device that placed the order.');
        setConfirmingPayment(false);
        return;
      }
      const batch = writeBatch(db);
      batch.update(doc(db, 'sessions', sessionId), { userConfirmedPayment: true });
      batch.update(doc(db, 'restaurants', session.restaurantId, 'orders', session.orderId), { paymentStatus: 'verifying' });
      await batch.commit();
      toast.success('Payment confirmation sent to the restaurant.');
    } catch (err) {
      console.error(err);
      toast.error('Failed to send payment confirmation.');
    } finally {
      setConfirmingPayment(false);
    }
  }

  useEffect(() => {
    if (session?.restaurantId && session?.orderId && session?.status === 'paid') {
      getOrder(session.restaurantId, session.orderId)
        .then(o => {
          if (o?.ratingSubmitted) {
            setAlreadyRated(true);
          }
        })
        .catch(console.error);
    }
  }, [session?.restaurantId, session?.orderId, session?.status]);

  useEffect(() => {
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';
    if (hasFirebase) {
      const unsubscribe = onAuthStateChanged(auth, (u) => {
        if (!u) {
          signInAnonymously(auth).then((cred) => {
            setCurrentUserUid(cred.user.uid);
            setAuthInitialized(true);
          }).catch(console.error);
        } else {
          setCurrentUserUid(u.uid);
          setAuthInitialized(true);
        }
      });
      return () => unsubscribe();
    } else {
      setAuthInitialized(true);
    }
  }, []);

  // Removed P2P selection methods

  async function handleRatingSubmit() {
    if (!session || stars === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmittingRating(true);
    try {
      await submitRating(session.restaurantId, {
        orderId: session.orderId,
        customerName: session.customerName,
        tableNumber: session.tableNumber,
        stars,
        comment,
        rewardClaimed: reward,
        verified: false,
        createdAt: Timestamp.now(),
      });
      await updateOrder(session.restaurantId, session.orderId, { ratingSubmitted: true });
      setSubmittedRating(true);
      toast.success('Thank you for your feedback!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to submit rating');
    } finally {
      setSubmittingRating(false);
    }
  }

  useEffect(() => {
    if (!sessionId) return;

    const docRef = doc(db, 'sessions', sessionId);
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SessionData;
        setSession(data);

        // Check expiration
        const now = Timestamp.now();
        if (data.expiresAt && data.expiresAt.toMillis() < now.toMillis()) {
          setIsExpired(true);
        } else if (!qrGeneratedRef.current) {
          // Generate UPI Link
          const cleanName = encodeURIComponent(data.restaurantName || 'Restaurant');
          const upiLink = data.upiType === 'merchant'
            ? `upi://pay?pa=${data.upiId}&pn=${cleanName}&am=${data.totalAmount}&tn=Order-${sessionId.slice(0, 8)}&cu=INR`
            : `upi://pay?pa=${data.upiId}&pn=${cleanName}&cu=INR`;

          // Generate QR Code URL
          try {
            const url = await QRCode.toDataURL(upiLink, {
              margin: 1,
              width: 256,
              color: {
                dark: '#1A1814',
                light: '#FAFAF8',
              }
            });
            setQrCodeUrl(url);
            qrGeneratedRef.current = true;
          } catch {
            toast.error('Failed to generate payment QR code.');
          }
        }
        setLoading(false);
      } else {
        setSession(null);
        setLoading(false);
      }
    }, () => {
      toast.error('Failed to load payment details.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionId]);

  const upiLink = session
    ? (session.upiType === 'merchant'
        ? `upi://pay?pa=${session.upiId}&pn=${encodeURIComponent(session.restaurantName)}&am=${session.totalAmount}&tn=Order-${sessionId!.slice(0, 8)}&cu=INR`
        : `upi://pay?pa=${session.upiId}&pn=${encodeURIComponent(session.restaurantName)}&cu=INR`)
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-50 flex flex-col items-center justify-center p-6 text-center font-ui">
        <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl shadow-warm-200/50 flex flex-col items-center border border-warm-100">
          <div className="w-16 h-16 rounded-full bg-warm-200 animate-pulse mb-4" />
          <div className="h-6 w-48 bg-warm-200 rounded animate-pulse mb-1" />
          <div className="h-4 w-32 bg-warm-200 rounded animate-pulse mb-6" />
          
          <div className="w-full bg-warm-50 rounded-2xl p-4 mb-6">
            <div className="h-8 w-32 bg-warm-200 rounded animate-pulse mx-auto mb-2" />
            <div className="h-3 w-24 bg-warm-200 rounded animate-pulse mx-auto" />
          </div>

          <div className="w-full aspect-square max-w-[200px] bg-warm-100 rounded-2xl animate-pulse mb-6" />
          
          <div className="w-full h-14 bg-warm-200 rounded-xl animate-pulse mb-3" />
        </div>
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
        <button onClick={() => navigate(getMenuUrl())} className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand-900 hover:text-brand-500">
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
              onClick={() => navigate(getMenuUrl())} 
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
          
          {isDifferentUser && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-left flex gap-3 items-start animate-fade-in">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-900">Device/Browser Mismatch</h4>
                <p className="text-[10px] text-red-700 mt-1 leading-normal font-medium">
                  You are viewing this payment page in a different browser session or device.
                  To prevent unauthorized actions, <strong>marking payment as paid or leaving feedback is disabled</strong>.
                  Please complete these actions on the device and browser you used to place your order.
                </p>
              </div>
            </div>
          )}
          
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
              
              {alreadyRated || submittedRating ? (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-5 text-center mt-4">
                  <CheckCircle2 className="w-10 h-10 text-[#22c55e] mx-auto mb-2" />
                  <p className="text-sm font-bold text-green-900">
                    {submittedRating ? 'Thank you for your rating!' : 'Feedback Already Submitted'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {submittedRating ? 'Your feedback helps us serve you better.' : 'You have already submitted a rating for this order.'}
                  </p>
                  {reward && (
                    <div className="mt-3 bg-white border border-green-150 rounded-xl p-3 text-left">
                      <p className="text-[#22c55e] font-semibold text-[10px] uppercase tracking-wider">Your Reward Claimed:</p>
                      <p className="text-warm-900 font-bold text-sm mt-1">
                        {reward === 'discount' ? `🎁 ${restaurant?.rewards?.discountLabel}` : `🍰 ${restaurant?.rewards?.dessertLabel}`}
                      </p>
                      <p className="text-warm-600 text-[10px] mt-0.5">Show this to your waiter to claim.</p>
                    </div>
                  )}
                  {restaurant?.googleReviewUrl && (
                    <a
                      href={restaurant.googleReviewUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#22c55e] text-white font-medium px-4 py-2.5 rounded-xl text-xs hover:bg-[#16a34a] transition-colors mt-3 w-full shadow-sm"
                    >
                      Leave a Google Review <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <div className="bg-white border border-warm-200 rounded-2xl p-5 shadow-sm mt-4 text-center">
                  <h4 className="text-sm font-bold text-warm-900 mb-3">How was your experience?</h4>
                  
                  {/* Star Rating buttons */}
                  <div className="flex items-center justify-center gap-2.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => {
                      const filled = i < (hover || stars);
                      return (
                        <button
                          key={i}
                          disabled={isDifferentUser}
                          onMouseEnter={() => !isDifferentUser && setHover(i + 1)}
                          onMouseLeave={() => !isDifferentUser && setHover(0)}
                          onClick={() => !isDifferentUser && setStars(i + 1)}
                          className="transition-transform hover:scale-110 focus:outline-none disabled:opacity-50"
                        >
                          <Star className={`w-8 h-8 ${filled ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-stone-200'}`} />
                        </button>
                      );
                    })}
                  </div>

                  {/* Smooth sliding container */}
                  <div 
                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                      stars > 0 ? 'max-h-[500px] opacity-100 mt-4' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      disabled={isDifferentUser}
                      placeholder="Tell us more... (optional)"
                      rows={3}
                      className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-xs text-stone-900 focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none mb-4 disabled:opacity-60"
                    />

                    {restaurant?.rewards?.active && stars >= 4 && (
                      <div className="mb-4 text-left">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Gift className="w-4 h-4 text-[#22c55e]" />
                          <p className="text-stone-900 font-bold text-xs">Choose your reward!</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setReward(reward === 'discount' ? null : 'discount')}
                            className={`border rounded-xl p-2.5 text-center transition-all ${
                              reward === 'discount' 
                                ? 'border-[#22c55e] bg-green-50/50 shadow-sm' 
                                : 'border-stone-200 hover:border-green-200'
                            }`}
                          >
                            <p className="text-base mb-0.5">💰</p>
                            <p className="text-stone-900 font-bold text-[10px] truncate">{restaurant?.rewards?.discountLabel}</p>
                            <p className="text-stone-400 text-[9px]">Next order</p>
                          </button>
                          <button
                            onClick={() => setReward(reward === 'dessert' ? null : 'dessert')}
                            className={`border rounded-xl p-2.5 text-center transition-all ${
                              reward === 'dessert' 
                                ? 'border-[#22c55e] bg-green-50/50 shadow-sm' 
                                : 'border-stone-200 hover:border-green-200'
                            }`}
                          >
                            <p className="text-base mb-0.5">🍰</p>
                            <p className="text-stone-900 font-bold text-[10px] truncate">{restaurant?.rewards?.dessertLabel}</p>
                            <p className="text-stone-400 text-[9px] truncate">{restaurant?.rewards?.dessertDescription}</p>
                          </button>
                        </div>
                        {reward && <p className="text-[#52525b] text-[9px] mt-1.5 text-center font-medium">Show this to your waiter to claim</p>}
                      </div>
                    )}

                    <button
                      onClick={handleRatingSubmit}
                      disabled={submittingRating || stars === 0 || isDifferentUser}
                      className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-60 flex items-center justify-center gap-2 text-xs shadow-sm shadow-[#22c55e]/25"
                    >
                      {submittingRating && <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                      Submit Rating
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Active Payment Screen */
            <div className="space-y-6 text-center animate-slide-up">
              <div className="space-y-1">
                <p className="text-[11px] text-warm-600 uppercase font-semibold tracking-widest">Table {session.tableNumber} · Total Amount</p>
                <h1 className="font-sans font-black text-5xl tracking-tight text-warm-900">{formatCurrency(session.totalAmount, '₹')}</h1>
              </div>

              {!session.userConfirmedPayment ? (
                <>
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
                    {session.upiType !== 'merchant' && (
                      <p className="text-[10px] text-amber-600 mt-2 font-bold uppercase tracking-wide">
                        * Enter amount {formatCurrency(session.totalAmount, '₹')} manually after scanning
                      </p>
                    )}
                  </div>

                  {/* Mobile Deep Link Button */}
                  <div className="space-y-3.5">
                    <a
                      href={upiLink}
                      className="w-full bg-brand-500 hover:bg-brand-600 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 text-sm transition-all transform active:scale-98"
                    >
                      <Smartphone className="w-4 h-4" /> Pay directly via UPI Apps
                    </a>
                    
                    {session.upiType !== 'merchant' ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left max-w-xs mx-auto">
                        <p className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                          MANUAL ENTRY REQUIRED
                        </p>
                        <p className="text-[10px] text-amber-700 mt-1 leading-normal font-medium">
                          Since this is a peer-to-peer transfer, you must <strong>manually enter the amount of {formatCurrency(session.totalAmount, '₹')}</strong> in your payment app when it opens.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-warm-600 leading-normal max-w-xs mx-auto">
                        Clicking the button will open GPay, PhonePe, Paytm, or BHIM directly on your mobile device.
                      </p>
                    )}
                  </div>

                  {/* Step checklist */}
                  <div className="h-[1px] bg-warm-200" />
                  
                  <div className="text-left space-y-3 px-2">
                    <h4 className="text-[11px] font-semibold text-warm-600 uppercase tracking-widest">Payment Steps</h4>
                    <ol className="text-xs text-warm-800 space-y-2 list-decimal list-inside font-medium leading-relaxed">
                      <li>Scan the QR code or click the direct payment button above.</li>
                      <li>Enter your UPI PIN to secure the transaction in your bank app.</li>
                      <li>Click the green <strong>I have paid</strong> button below.</li>
                    </ol>
                  </div>
                </>
              ) : (
                <div className="py-8 space-y-4">
                  <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-sm animate-pulse">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-display font-bold text-xl text-warm-900">Payment Pending Confirmation</h3>
                    <p className="text-warm-600 text-sm max-w-xs mx-auto">
                      We've notified the restaurant that you have completed the payment. Please keep this screen open while the staff verifies the transaction.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        {session.status !== 'paid' && (
          <div className="space-y-4 pt-6 border-t border-warm-200 mt-6">
            {session.userConfirmedPayment ? (
              <div className="w-full bg-brand-900/10 text-brand-900 font-semibold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm text-center">
                <span className="w-4 h-4 border-2 border-brand-900 border-t-transparent rounded-full animate-spin shrink-0" />
                <span>Awaiting confirmation from restaurant...</span>
              </div>
            ) : (
              <button
                onClick={handleConfirmPayment}
                disabled={confirmingPayment || isDifferentUser}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3.5 px-4 rounded-xl shadow-md flex items-center justify-center gap-2.5 text-sm transition-all transform active:scale-98 disabled:opacity-60 font-display uppercase tracking-wider"
              >
                {confirmingPayment ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0 animate-pulse" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                )}
                I have paid
              </button>
            )}
            
            <div className="flex items-center justify-center gap-1.5 text-warm-600">
              <ShieldCheck className="w-4 h-4 text-[#2D7A3A]" />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Secure Peer-to-Peer UPI Transfer
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
