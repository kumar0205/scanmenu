import { useState } from 'react';
import { Check, Crown, ChevronDown, ChevronUp } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';

import { updateRestaurant } from '../../firebase/db';
import toast from 'react-hot-toast';

export default function Subscription() {
  const { restaurant, restaurantId, setRestaurant, isDemo } = useAuthContext();
  const { t } = useI18n();
  const currentPlan = restaurant?.plan ?? 'free';
  const [contactModal, setContactModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  async function handleSelectPlan(planId: string) {
    setLoadingPlan(planId);
    try {
      if (!isDemo && restaurantId) {
        await updateRestaurant(restaurantId, { plan: planId as "free" | "pro" | "business" });
      }
      setRestaurant({ ...restaurant!, plan: planId as "free" | "pro" | "business" });
      toast.success(planId === 'free' ? 'Subscription cancelled successfully!' : `Upgraded to ${planId} plan successfully!`);
    } catch {
      toast.error('Failed to change plan');
    } finally {
      setLoadingPlan(null);
    }
  }

  const PLANS = [
    {
      id: 'free',
      name: t('subscription.free'),
      price: '₹0',
      sub: t('subscription.forever'),
      features: ['1 restaurant', 'Up to 15 menu items', '4 tables', 'Basic QR codes', 'WhatsApp ordering', '"ScanMenu" branding on menu'],
    },
    {
      id: 'pro',
      name: t('subscription.pro'),
      price: '₹0',
      sub: t('subscription.perMonth'),
      highlight: true,
      features: ['Everything in Free', 'Unlimited menu items', 'Unlimited tables', 'Remove ScanMenu branding', 'Real-time order dashboard', 'Customer ratings system', 'Basic analytics', 'Priority support'],
    },
    {
      id: 'business',
      name: t('subscription.business'),
      price: '₹0',
      sub: t('subscription.perMonth'),
      features: ['Everything in Pro', 'Multiple branches', 'Staff accounts', 'Advanced analytics', 'Google Business integration', 'Customer rewards system', 'Custom domain support', 'Dedicated support'],
    },
  ];

  const FAQ = [
    { q: t('subscription.faq1.q'), a: t('subscription.faq1.a') },
    { q: t('subscription.faq2.q'), a: t('subscription.faq2.a') },
    { q: t('subscription.faq3.q'), a: t('subscription.faq3.a') },
    { q: t('subscription.faq4.q'), a: t('subscription.faq4.a') },
  ];

  return (
    <div className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-slate-900 dark:text-premium-text transition-colors duration-200">
      <AdminHeader title={t('header.title.subscription')} />
      <div className="p-6 space-y-6">
        {/* Current plan banner */}
        <div className={`border rounded-xl p-4 flex items-center gap-3 ${currentPlan !== 'free' ? 'bg-[rgba(34,197,94,0.08)] border-[rgba(34,197,94,0.3)]' : 'bg-white dark:bg-premium-card border-slate-200 dark:border-premium-border shadow-sm dark:shadow-premium'}`}>
          <Crown className={`w-5 h-5 ${currentPlan !== 'free' ? 'text-[#22c55e]' : 'text-slate-400 dark:text-premium-muted'}`} />
          <div>
            <p className="text-slate-900 dark:text-premium-text font-medium">{t('subscription.currentPlan')}: <span className="capitalize">{currentPlan}</span></p>
            <p className="text-slate-500 dark:text-premium-muted text-xs mt-0.5">
              {currentPlan === 'free' ? t('subscription.upgradePrompt') : t('subscription.thankYou')}
            </p>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div key={plan.id} className={`relative bg-white dark:bg-premium-card border rounded-xl p-6 shadow-sm dark:shadow-premium ${plan.highlight ? 'border-[#22c55e]' : 'border-slate-200 dark:border-premium-border'}`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#22c55e] text-white text-xs font-semibold px-3 py-1 rounded-full whitespace-nowrap">
                  {t('subscription.mostPopular')}
                </div>
              )}
              <h3 className="text-slate-900 dark:text-premium-text font-bold text-xl mb-1">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-slate-900 dark:text-premium-text">{plan.price}</span>
                <span className="text-slate-500 dark:text-premium-muted text-sm">/{plan.sub}</span>
              </div>
              <div className="border-t border-slate-150 dark:border-premium-border/40 mb-4" />
              <ul className="space-y-2.5 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-slate-500 dark:text-premium-muted">
                    <Check className="w-4 h-4 text-[#22c55e] mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {currentPlan === plan.id ? (
                <button disabled className="w-full py-2.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-premium-bg text-slate-400 dark:text-premium-muted cursor-not-allowed border border-slate-250 dark:border-premium-border/40">
                  {t('subscription.currentPlan')}
                </button>
              ) : (
                <Button
                  variant={plan.highlight ? 'primary' : 'outline'}
                  fullWidth
                  loading={loadingPlan === plan.id}
                  onClick={() => handleSelectPlan(plan.id)}
                >
                  {plan.id === 'free' ? 'Downgrade' : `${t('subscription.upgrade')} ${plan.name}`}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* FAQ */}
        <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-xl p-5 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-900 dark:text-premium-text font-semibold mb-4">{t('subscription.faq')}</h3>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="border border-slate-200 dark:border-premium-border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-left text-sm text-slate-900 dark:text-premium-text hover:bg-slate-50 dark:hover:bg-premium-hover transition-colors"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  {item.q}
                  {openFaq === i ? <ChevronUp className="w-4 h-4 text-slate-400 dark:text-premium-muted" /> : <ChevronDown className="w-4 h-4 text-slate-400 dark:text-premium-muted" />}
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-3 text-sm text-slate-500 dark:text-premium-muted border-t border-slate-200 dark:border-premium-border/40 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal open={contactModal} onClose={() => setContactModal(false)} title={t('subscription.upgradePlan')}>
        <div className="text-center py-4">
          <p className="text-slate-500 dark:text-premium-muted text-sm mb-6">{t('subscription.contactPrompt')}</p>
          <a
            href="https://wa.me/919999999999?text=I'd like to upgrade my ScanMenu plan"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-[#22c55e] hover:bg-[#16a34a] text-white font-medium px-6 py-3 rounded-xl transition-colors"
          >
            {t('subscription.contactWa')}
          </a>
        </div>
      </Modal>
    </div>
  );
}
