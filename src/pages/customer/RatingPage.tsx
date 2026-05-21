import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Star, Gift, ExternalLink, CheckCircle } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { useRestaurant } from '../../hooks/useRestaurant';
import { getOrder, submitRating, updateOrder } from '../../firebase/db';
import { mockOrders } from '../../lib/mockData';
import type { Order } from '../../types';

export default function RatingPage() {
  const { restaurantSlug, orderId } = useParams<{ restaurantSlug: string; orderId: string }>();
  const { restaurant, loading: rLoading } = useRestaurant(restaurantSlug);
  const [order, setOrder] = useState<Order | null>(null);
  const [oLoading, setOLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [reward, setReward] = useState<'discount' | 'dessert' | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alreadyRated, setAlreadyRated] = useState(false);

  useEffect(() => {
    if (!restaurant || !orderId) return;
    const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';
    if (!hasFirebase) {
      // Demo mode: use a mock order
      const mock = mockOrders.find(o => o.id === orderId) ?? {
        ...mockOrders[0],
        id: orderId,
        ratingSubmitted: false,
      };
      setOrder(mock);
      if (mock.ratingSubmitted) setAlreadyRated(true);
      setOLoading(false);
      return;
    }
    getOrder(restaurant.id, orderId).then(o => {
      if (!o) { setOLoading(false); return; }
      setOrder(o);
      if (o.ratingSubmitted) setAlreadyRated(true);
      setOLoading(false);
    });
  }, [restaurant, orderId]);

  async function submit() {
    if (!restaurant || !order || stars === 0) {
      toast.error('Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const hasFirebase = !!import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_API_KEY !== 'placeholder';
      if (hasFirebase) {
        await submitRating(restaurant.id, {
          orderId: order.id,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          stars,
          comment,
          rewardClaimed: reward,
          verified: false,
          createdAt: Timestamp.now(),
        });
        await updateOrder(restaurant.id, order.id, { ratingSubmitted: true });
      }
      setSubmitted(true);
    } finally { setSubmitting(false); }
  }

  const showRewards = restaurant?.rewards?.active && stars >= 4;

  if (rLoading || oLoading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (alreadyRated && !submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          <CheckCircle className="w-14 h-14 text-[#22c55e] mx-auto mb-4" />
          <h2 className="text-gray-900 font-bold text-xl mb-2">Already Rated</h2>
          <p className="text-gray-500 text-sm">You've already submitted a rating for this order. Thank you!</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-sm border border-gray-100">
          {restaurant?.logoUrl && <img src={restaurant.logoUrl} className="w-14 h-14 rounded-full mx-auto mb-4 object-cover" alt="logo" />}
          <CheckCircle className="w-14 h-14 text-[#22c55e] mx-auto mb-4" />
          <h2 className="text-gray-900 font-bold text-xl mb-2">Thank you, {order?.customerName}!</h2>
          <p className="text-gray-500 text-sm mb-6">Your feedback means a lot to us.</p>
          {reward && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <p className="text-[#22c55e] font-medium text-sm">
                {reward === 'discount' ? `🎁 ${restaurant?.rewards?.discountLabel}` : `🍰 ${restaurant?.rewards?.dessertLabel}`}
              </p>
              <p className="text-gray-500 text-xs mt-1">Show this to your waiter to claim your reward</p>
            </div>
          )}
          {restaurant?.googleReviewUrl && (
            <a
              href={restaurant.googleReviewUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 bg-[#22c55e] text-white font-medium px-5 py-3 rounded-xl text-sm hover:bg-[#16a34a] transition-colors"
            >
              Leave a Google Review <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-sm border border-gray-100">
        <div className="text-center mb-6">
          {restaurant?.logoUrl && (
            <img src={restaurant.logoUrl} className="w-14 h-14 rounded-full mx-auto mb-3 object-cover" alt="logo" />
          )}
          <h1 className="text-gray-900 font-bold text-xl">How was your experience?</h1>
          <p className="text-gray-500 text-sm mt-1">Your feedback helps us improve</p>
        </div>

        <div className="flex items-center justify-center gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => {
            const filled = i < (hover || stars);
            return (
              <button
                key={i}
                onMouseEnter={() => setHover(i + 1)}
                onMouseLeave={() => setHover(0)}
                onClick={() => setStars(i + 1)}
                className="transition-transform hover:scale-110"
              >
                <Star className={`w-10 h-10 ${filled ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-gray-200'}`} />
              </button>
            );
          })}
        </div>

        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Tell us more... (optional)"
          rows={3}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#22c55e] resize-none mb-4"
        />

        {showRewards && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-[#22c55e]" />
              <p className="text-gray-900 font-medium text-sm">Choose your reward!</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setReward(reward === 'discount' ? null : 'discount')}
                className={`border-2 rounded-xl p-3 text-center transition-all ${reward === 'discount' ? 'border-[#22c55e] bg-green-50' : 'border-gray-200 hover:border-green-200'}`}
              >
                <p className="text-lg mb-1">💰</p>
                <p className="text-gray-900 font-medium text-xs">{restaurant?.rewards?.discountLabel}</p>
                <p className="text-gray-400 text-xs">Next order</p>
              </button>
              <button
                onClick={() => setReward(reward === 'dessert' ? null : 'dessert')}
                className={`border-2 rounded-xl p-3 text-center transition-all ${reward === 'dessert' ? 'border-[#22c55e] bg-green-50' : 'border-gray-200 hover:border-green-200'}`}
              >
                <p className="text-lg mb-1">🍰</p>
                <p className="text-gray-900 font-medium text-xs">{restaurant?.rewards?.dessertLabel}</p>
                <p className="text-gray-400 text-xs">{restaurant?.rewards?.dessertDescription}</p>
              </button>
            </div>
            {reward && <p className="text-[#52525b] text-xs mt-2 text-center">Show this to your waiter to claim</p>}
          </div>
        )}

        <button
          onClick={submit}
          disabled={submitting || stars === 0}
          className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-white font-semibold py-3.5 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          Submit Rating
        </button>
      </div>
    </div>
  );
}
