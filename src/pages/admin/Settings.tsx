import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Star, Gift, AlertTriangle, Loader2, Link2, ExternalLink, Droplets, Bell } from 'lucide-react';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { Modal } from '../../components/ui/Modal';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { updateRestaurant, deleteAllMenuItems } from '../../firebase/db';
import { uploadToCloudinary } from '../../utils/cloudinary';
import toast from 'react-hot-toast';
import type { Restaurant } from '../../types';

type RewardSettings = Restaurant['rewards'];

export default function Settings() {
  const { restaurant, restaurantId, setRestaurant, isDemo } = useAuthContext();
  const { t } = useI18n();
  const [name, setName] = useState(restaurant?.name ?? '');
  const [address, setAddress] = useState(restaurant?.address ?? '');
  const [streetArea, setStreetArea] = useState(restaurant?.streetArea ?? '');
  const [town, setTown] = useState(restaurant?.town ?? '');
  const [stateVal, setStateVal] = useState(restaurant?.state ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [currency, setCurrency] = useState(restaurant?.currency ?? '₹');
  const [upiId, setUpiId] = useState(restaurant?.upiId ?? '');
  const [googleUrl, setGoogleUrl] = useState(restaurant?.googleReviewUrl ?? '');
  const [rewards, setRewards] = useState<RewardSettings>(restaurant?.rewards ?? {
    active: false, discountPercent: 10, discountLabel: '10% Off', dessertLabel: 'Free Dessert', dessertDescription: 'On next order',
  });
  const [waterBottle, setWaterBottle] = useState(restaurant?.waterBottle ?? { enabled: false, price: 20 });
  const [callWaiter, setCallWaiter] = useState(restaurant?.callWaiter ?? { enabled: false });
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteItemsModal, setDeleteItemsModal] = useState(false);
  const [deleteItemsConfirm, setDeleteItemsConfirm] = useState('');
  const [deletingItems, setDeletingItems] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const menuUrl = `${window.location.origin}/${restaurant?.slug}`;

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setAddress(restaurant.address);
      setStreetArea(restaurant.streetArea ?? '');
      setTown(restaurant.town ?? '');
      setStateVal(restaurant.state ?? '');
      setPhone(restaurant.phone);
      setCurrency(restaurant.currency);
      setUpiId(restaurant.upiId ?? '');
      setGoogleUrl(restaurant.googleReviewUrl);
      setRewards(restaurant.rewards);
      if (restaurant.waterBottle) setWaterBottle(restaurant.waterBottle);
      if (restaurant.callWaiter) setCallWaiter(restaurant.callWaiter);
    }
  }, [restaurant]);

  async function saveInfo() {
    setSaving(true);
    try {
      const computedAddress = [streetArea.trim(), town.trim(), stateVal.trim()].filter(Boolean).join(', ');
      const updated = {
        ...restaurant!,
        name,
        address: computedAddress,
        streetArea,
        town,
        state: stateVal,
        phone,
        currency,
        upiId,
        googleReviewUrl: googleUrl,
      };
      if (!isDemo && restaurantId) {
        await updateRestaurant(restaurantId, {
          name,
          address: computedAddress,
          streetArea,
          town,
          state: stateVal,
          phone,
          currency,
          upiId,
          googleReviewUrl: googleUrl,
        });
      }
      setRestaurant(updated);
      toast.success(t('settings.settingsSaved'));
    } finally { setSaving(false); }
  }

  async function saveGoogle() {
    if (!isDemo && restaurantId) {
      await updateRestaurant(restaurantId, { googleReviewUrl: googleUrl });
    }
    setRestaurant({ ...restaurant!, googleReviewUrl: googleUrl });
    toast.success(t('generic.success'));
  }

  async function saveRewards() {
    if (!isDemo && restaurantId) {
      await updateRestaurant(restaurantId, { rewards });
    }
    setRestaurant({ ...restaurant!, rewards });
    toast.success(t('generic.success'));
  }

  async function saveWaterBottle() {
    if (!isDemo && restaurantId) {
      await updateRestaurant(restaurantId, { waterBottle });
    }
    setRestaurant({ ...restaurant!, waterBottle });
    toast.success(t('generic.success'));
  }

  async function saveCallWaiter() {
    if (!isDemo && restaurantId) {
      await updateRestaurant(restaurantId, { callWaiter });
    }
    setRestaurant({ ...restaurant!, callWaiter });
    toast.success(t('generic.success'));
  }

  async function handleLogoUpload(file: File) {
    if (isDemo) {
      toast.success('Logo upload skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    setUploadPct(0);
    try {
      const url = await uploadToCloudinary(file, 'logos', setUploadPct);
      await updateRestaurant(restaurantId, { logoUrl: url });
      setRestaurant({ ...restaurant!, logoUrl: url });
      toast.success(t('generic.success'));
    } finally { setUploadPct(null); }
  }

  function copyLink() {
    navigator.clipboard.writeText(menuUrl);
    toast.success('Menu link copied!');
  }

  async function handleDeleteAllItems() {
    if (isDemo) {
      toast.success('All items deleted (demo)');
      setDeleteItemsModal(false);
      setDeleteItemsConfirm('');
      return;
    }
    if (!restaurantId) return;
    setDeletingItems(true);
    try {
      await deleteAllMenuItems(restaurantId);
      toast.success('All menu items deleted successfully!');
      setDeleteItemsModal(false);
      setDeleteItemsConfirm('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete menu items');
    } finally {
      setDeletingItems(false);
    }
  }

  return (
    <div className="bg-[#0a0a0a] min-h-screen">
      <AdminHeader title={t('header.title.settings')} />
      <div className="p-6 space-y-5 max-w-2xl">
        {/* Restaurant Info */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-4">
            <SettingsIcon className="w-4 h-4 text-[#22c55e]" /> {t('settings.restaurantInfo')}
          </h3>
          <div className="space-y-4">
             <Input label={t('settings.restaurantName')} value={name} onChange={e => setName(e.target.value)} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Street / Area" value={streetArea} onChange={e => setStreetArea(e.target.value)} />
              <Input label="Town" value={town} onChange={e => setTown(e.target.value)} />
            </div>
            <Input label="State" value={stateVal} onChange={e => setStateVal(e.target.value)} />

            <div className="text-xs text-[#a1a1aa] bg-[#1a1a1a] p-3 rounded-lg border border-[#2a2a2a] flex flex-col gap-1">
              <div className="flex justify-between items-start">
                <span>Preview address:</span>
                <div className="text-right">
                  <span className="font-semibold text-white">
                    {[streetArea, town].filter(Boolean).join(', ') || 'No address specified'}
                  </span>
                  {stateVal && (
                    <div className="font-semibold text-[#a1a1aa] mt-0.5">{stateVal}</div>
                  )}
                </div>
              </div>
            </div>
            <Input label={t('settings.phone')} value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label={t('settings.upiId')} value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. merchant@upi" />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[#a1a1aa]">{t('settings.currency')}</label>
              <select
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="₹">₹ INR</option>
                <option value="$">$ USD</option>
                <option value="£">£ GBP</option>
                <option value="€">€ EUR</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4">
            <Button loading={saving} onClick={saveInfo}>{t('settings.saveChanges')}</Button>
            <button onClick={copyLink} className="flex items-center gap-1.5 border border-[#2a2a2a] text-[#a1a1aa] hover:text-white text-sm px-3 py-2 rounded-lg transition-all duration-150">
              <Link2 className="w-4 h-4" /> Copy Link
            </button>
            <a href={menuUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border border-[#2a2a2a] text-[#a1a1aa] hover:text-white text-sm px-3 py-2 rounded-lg transition-all duration-150">
              <ExternalLink className="w-4 h-4" /> View Menu
            </a>
          </div>
        </section>

        {/* Logo Upload */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">{t('settings.logo')}</h3>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden flex items-center justify-center">
              {restaurant?.logoUrl ? (
                <img src={restaurant.logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-[#52525b] text-xs">No logo</span>
              )}
            </div>
            <div>
              {uploadPct !== null ? (
                <div className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                  <Loader2 className="w-4 h-4 animate-spin" /> Uploading {uploadPct}%
                </div>
              ) : (
                <button onClick={() => fileRef.current?.click()} className="text-sm text-[#22c55e] hover:underline">
                  {t('settings.uploadLogo')}
                </button>
              )}
              <p className="text-[#52525b] text-xs mt-1">PNG, JPG up to 2MB</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); }} />
            </div>
          </div>
        </section>

        {/* Google Business */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-[#22c55e]" /> Google Business Integration
          </h3>
          <p className="text-[#52525b] text-xs mb-4">Link your Google Business to direct customer ratings to your Google profile.</p>
          <Input
            label="Google Business Review URL"
            placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
            value={googleUrl}
            onChange={e => setGoogleUrl(e.target.value)}
          />
          <p className="text-[#52525b] text-xs mt-1.5">Find your review link in Google Business Profile → Share → Get more reviews</p>
          <Button className="mt-4" onClick={saveGoogle}>{t('generic.save')}</Button>
        </section>

        {/* Rewards */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#22c55e]" /> Customer Rewards
            </h3>
            <Toggle checked={rewards.active} onChange={v => setRewards(r => ({ ...r, active: v }))} />
          </div>
          <p className="text-[#52525b] text-xs mb-4">Configure rewards customers receive when they rate their order.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Discount %" type="number" value={String(rewards.discountPercent)} onChange={e => setRewards(r => ({ ...r, discountPercent: Number(e.target.value) }))} suffix="%" />
            <Input label="Discount Label" value={rewards.discountLabel} onChange={e => setRewards(r => ({ ...r, discountLabel: e.target.value }))} />
            <Input label="Dessert Label" value={rewards.dessertLabel} onChange={e => setRewards(r => ({ ...r, dessertLabel: e.target.value }))} />
            <Input label="Dessert Description" value={rewards.dessertDescription} onChange={e => setRewards(r => ({ ...r, dessertDescription: e.target.value }))} />
          </div>
          <div className="bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 mb-4">
            <p className="text-[#52525b] text-xs mb-3">Preview</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-lg p-3 text-center">
                <p className="text-lg mb-1">💰</p>
                <p className="text-[#22c55e] text-sm font-medium">{rewards.discountLabel}</p>
                <p className="text-[#52525b] text-xs">Next order</p>
              </div>
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg p-3 text-center">
                <p className="text-lg mb-1">🍰</p>
                <p className="text-white text-sm font-medium">{rewards.dessertLabel}</p>
                <p className="text-[#52525b] text-xs">{rewards.dessertDescription}</p>
              </div>
            </div>
          </div>
          <Button onClick={saveRewards}>{t('generic.save')}</Button>
        </section>

        {/* Customer Water Requests */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#22c55e]" /> Customer Water Requests
            </h3>
            <Toggle checked={waterBottle.enabled} onChange={v => setWaterBottle(w => ({ ...w, enabled: v }))} />
          </div>
          <p className="text-[#52525b] text-xs mb-4">Toggle the "Request Water" button on customer menu. When enabled, customers can request water bottles directly from their table.</p>
          {waterBottle.enabled && (
            <div className="mb-4">
              <Input label="Water Bottle Price" type="number" value={String(waterBottle.price)} onChange={e => setWaterBottle(w => ({ ...w, price: Number(e.target.value) }))} suffix={restaurant?.currency ?? '₹'} />
            </div>
          )}
          <Button onClick={saveWaterBottle}>{t('generic.save')}</Button>
        </section>

        {/* Call Waiter */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#22c55e]" /> Customer Call Waiter
            </h3>
            <Toggle checked={callWaiter.enabled} onChange={v => setCallWaiter(w => ({ ...w, enabled: v }))} />
          </div>
          <p className="text-[#52525b] text-xs mb-4">Toggle the "Call Waiter" button on customer menu. When enabled, customers can call a waiter directly from their table.</p>
          <Button onClick={saveCallWaiter}>{t('generic.save')}</Button>
        </section>

        {/* Danger Zone */}
        <section className="bg-[#111111] border border-[rgba(239,68,68,0.3)] rounded-xl p-5">
          <h3 className="text-[#ef4444] font-semibold flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h3>
          <p className="text-[#52525b] text-xs mb-4">Permanently delete menu items or your entire restaurant account. This action cannot be undone.</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="danger" onClick={() => setDeleteItemsModal(true)}>Delete All Menu Items</Button>
            <Button variant="danger" onClick={() => setDeleteModal(true)}>Delete Account</Button>
          </div>
        </section>
      </div>

      <Modal open={deleteItemsModal} onClose={() => setDeleteItemsModal(false)} title="Delete All Menu Items">
        <p className="text-[#a1a1aa] text-sm mb-4">
          This will permanently delete all menu items in your restaurant. Type <strong className="text-white">DELETE ITEMS</strong> to confirm.
        </p>
        <Input placeholder="Type DELETE ITEMS" value={deleteItemsConfirm} onChange={e => setDeleteItemsConfirm(e.target.value)} />
        <Button variant="danger" fullWidth className="mt-4" disabled={deleteItemsConfirm !== 'DELETE ITEMS'} loading={deletingItems} onClick={handleDeleteAllItems}>
          Delete All Items
        </Button>
      </Modal>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account">
        <p className="text-[#a1a1aa] text-sm mb-4">
          This will permanently delete your restaurant, menu, orders, and all data. Type <strong className="text-white">DELETE</strong> to confirm.
        </p>
        <Input placeholder="Type DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
        <Button variant="danger" fullWidth className="mt-4" disabled={deleteConfirm !== 'DELETE'}>
          Delete Everything
        </Button>
      </Modal>
    </div>
  );
}
