import { useState, useEffect } from 'react';
import { Star, Clock, CheckCircle, Gift, ExternalLink } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { subscribeToRatings, verifyRating } from '../../firebase/db';
import { formatTimeAgo } from '../../utils/formatters';
import { useNow } from '../../hooks/useNow';
import toast from 'react-hot-toast';
import type { Rating } from '../../types';

export default function Ratings() {
  const { restaurantId, restaurant } = useAuthContext();
  const { t } = useI18n();
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  useNow(1000); // tick every second so formatTimeAgo stays live

  useEffect(() => {
    if (!restaurantId) return;
    return subscribeToRatings(restaurantId, r => { setRatings(r); setLoading(false); });
  }, [restaurantId]);

  const pending = ratings.filter(r => !r.verified).length;
  const verified = ratings.filter(r => r.verified).length;
  const rewarded = ratings.filter(r => r.rewardClaimed).length;

  async function verify(rating: Rating) {
    try {
      if (restaurantId) {
        await verifyRating(restaurantId, rating.id);
        toast.success('Rating verified successfully!');
      }
      if (restaurant?.googleReviewUrl) {
        window.open(restaurant.googleReviewUrl, '_blank');
      }
    } catch {
      toast.error('Failed to verify rating.');
    }
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.ratings')} />
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: Clock, label: t('orders.status.pending'), value: pending, color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
            { icon: CheckCircle, label: t('ratings.verified'), value: verified, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
            { icon: Gift, label: t('ratings.average'), value: rewarded, color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <p className="text-white text-2xl font-semibold">{value}</p>
              <p className="text-[#a1a1aa] text-xs mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <Star className="w-4 h-4 text-[#22c55e]" /> {t('header.title.ratings')}
          </h3>

          {loading ? (
            <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-32" />)}</div>
          ) : ratings.length === 0 ? (
            <div className="text-center py-12">
              <Star className="w-16 h-16 text-[#2a2a2a] mx-auto mb-3" />
              <p className="text-white font-medium">{t('ratings.noRatings')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ratings.map(r => (
                <div key={r.id} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-white font-medium">{r.customerName}</p>
                      <p className="text-[#52525b] text-xs">{t('generic.table')} {r.tableNumber} · {formatTimeAgo(r.createdAt)}</p>
                    </div>
                    <Badge variant={r.verified ? 'green' : 'amber'}>{r.verified ? t('ratings.verified') : t('orders.status.pending')}</Badge>
                  </div>
                  <div className="flex items-center gap-0.5 mb-2">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-4 h-4 ${i < r.stars ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#2a2a2a]'}`} />
                    ))}
                  </div>
                  {r.comment && (
                    <p className="text-[#a1a1aa] text-sm italic">"{r.comment}"</p>
                  )}
                  {r.rewardClaimed && (
                    <div className="flex items-center gap-1.5 mt-2 text-[#22c55e] text-xs">
                      <Gift className="w-3.5 h-3.5" />
                      Claimed: {r.rewardClaimed}
                    </div>
                  )}
                  {!r.verified && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-3"
                      onClick={() => verify(r)}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Verify & Direct to Google
                      {restaurant?.googleReviewUrl && <ExternalLink className="w-3 h-3 ml-1" />}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
