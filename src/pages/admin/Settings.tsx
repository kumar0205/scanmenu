import { useState, useRef, useEffect } from 'react';
import { Settings as SettingsIcon, Star, Gift, AlertTriangle, Loader2, Link2, ExternalLink, Droplets, Bell, X, Plus, Globe } from 'lucide-react';
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
  const { t, language, setLanguage } = useI18n();
  const [name, setName] = useState(restaurant?.name ?? '');
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
  const [waterBottle, setWaterBottle] = useState(restaurant?.waterBottle ?? {
    enabled: false,
    price: 20,
    ml: 1000,
    options: [
      { id: '500ml', ml: '500ml', price: 20 },
      { id: '1l', ml: '1L', price: 30 },
      { id: '2l', ml: '2L', price: 45 }
    ]
  });
  const [callWaiter, setCallWaiter] = useState(restaurant?.callWaiter ?? { enabled: false });
  const [saving, setSaving] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const deletingAccount = false;
  const [deleteItemsModal, setDeleteItemsModal] = useState(false);
  const [deleteItemsConfirm, setDeleteItemsConfirm] = useState('');
  const [deletingItems, setDeletingItems] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverFilesRef = useRef<HTMLInputElement>(null);
  const [coverImages, setCoverImages] = useState<string[]>(restaurant?.coverImages ?? (restaurant?.coverImageUrl ? [restaurant.coverImageUrl] : []));
  const [coverUploadPct, setCoverUploadPct] = useState<number | null>(null);
  const menuUrl = `${window.location.origin}/${restaurant?.slug}`;

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setStreetArea(restaurant.streetArea ?? '');
      setTown(restaurant.town ?? '');
      setStateVal(restaurant.state ?? '');
      setPhone(restaurant.phone);
      setCurrency(restaurant.currency);
      setUpiId(restaurant.upiId ?? '');
      setGoogleUrl(restaurant.googleReviewUrl);
      setRewards(restaurant.rewards);
      if (restaurant.waterBottle) {
        const wb = { ...restaurant.waterBottle };
        if (!wb.options || wb.options.length === 0) {
          wb.options = [
            { id: 'opt-' + Math.random().toString(36).substring(2, 7), ml: `${wb.ml ?? 1000}ml`, price: wb.price ?? 20 }
          ];
        }
        setWaterBottle(wb);
      }
      if (restaurant.callWaiter) setCallWaiter(restaurant.callWaiter);
      if (restaurant.coverImages) setCoverImages(restaurant.coverImages);
      else if (restaurant.coverImageUrl) setCoverImages([restaurant.coverImageUrl]);
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
    if (waterBottle.enabled) {
      const opts = waterBottle.options || [];
      if (opts.length === 0) {
        toast.error("At least one water bottle option is required when enabled");
        return;
      }
      for (const opt of opts) {
        if (!opt.ml.trim()) {
          toast.error("Bottle size/volume cannot be empty");
          return;
        }
        if (opt.price < 0) {
          toast.error("Price cannot be negative");
          return;
        }
      }
    }
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

  async function handleCoverImagesUpload(files: FileList) {
    if (isDemo) {
      toast.success('Photos upload skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    setCoverUploadPct(0);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadToCloudinary(files[i], 'covers', (pct) => {
          setCoverUploadPct(Math.round(((i * 100) + pct) / files.length));
        });
        uploadedUrls.push(url);
      }
      const newImages = [...coverImages, ...uploadedUrls];
      await updateRestaurant(restaurantId, { coverImages: newImages, coverImageUrl: newImages[0] });
      setRestaurant({ ...restaurant!, coverImages: newImages, coverImageUrl: newImages[0] });
      setCoverImages(newImages);
      toast.success(t('generic.success'));
    } catch {
      toast.error('Failed to upload photos');
    } finally {
      setCoverUploadPct(null);
      if (coverFilesRef.current) coverFilesRef.current.value = '';
    }
  }

  async function removeCoverImage(index: number) {
    if (isDemo) {
      toast.success('Photo removal skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    const newImages = [...coverImages];
    newImages.splice(index, 1);
    await updateRestaurant(restaurantId, { coverImages: newImages, coverImageUrl: newImages[0] || '' });
    setRestaurant({ ...restaurant!, coverImages: newImages, coverImageUrl: newImages[0] || '' });
    setCoverImages(newImages);
    toast.success('Photo removed');
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
    } catch {
      toast.error('Failed to delete menu items');
    } finally {
      setDeletingItems(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== 'DELETE') return;
    toast.error('Account deletion is currently disabled. Please contact support.');
    setDeleteModal(false);
    setDeleteConfirm('');
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

        {/* Language Settings */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold flex items-center gap-2 mb-1">
            <Globe className="w-4 h-4 text-[#22c55e]" /> {t('settings.language')}
          </h3>
          <p className="text-[#52525b] text-xs mb-4">{t('settings.selectLanguage')}</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { code: 'en', native: 'English' },
              { code: 'te', native: 'తెలుగు' },
              { code: 'hi', native: 'हिंदी' }
            ].map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as 'en' | 'te' | 'hi')}
                  className={`p-3 rounded-lg border text-left transition-all duration-200 flex flex-col gap-1 ${
                    isSelected
                      ? 'border-[#22c55e] bg-[#22c55e]/10 text-white'
                      : 'border-[#2a2a2a] bg-[#1a1a1a] text-[#a1a1aa] hover:border-[#52525b] hover:text-white'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                    {lang.code}
                  </span>
                  <span className="text-sm font-bold">{lang.native}</span>
                </button>
              );
            })}
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

        {/* Restaurant Photos */}
        <section className="bg-[#111111] border border-[#2a2a2a] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-1">Restaurant Photos</h3>
          <p className="text-[#52525b] text-xs mb-4">Upload photos of your restaurant to show on the menu header. You can upload multiple photos.</p>
          
          <div className="flex flex-wrap gap-4 mb-4">
            {coverImages.map((url, idx) => (
              <div key={idx} className="relative w-32 h-24 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] overflow-hidden group">
                <img src={url} alt={`Cover ${idx}`} className="w-full h-full object-cover" />
                <button 
                  onClick={() => removeCoverImage(idx)}
                  className="absolute top-1 right-1 bg-red-500/80 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            
            <button
              onClick={() => coverFilesRef.current?.click()}
              className="w-32 h-24 rounded-lg border-2 border-dashed border-[#2a2a2a] hover:border-[#22c55e] flex flex-col items-center justify-center gap-1 text-[#52525b] hover:text-[#22c55e] transition-colors"
            >
              {coverUploadPct !== null ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="w-5 h-5 animate-spin text-[#22c55e]" />
                  <span className="text-xs">{coverUploadPct}%</span>
                </div>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span className="text-xs font-medium">Add Photos</span>
                </>
              )}
            </button>
            <input 
              ref={coverFilesRef} 
              type="file" 
              accept="image/*" 
              multiple 
              className="hidden" 
              onChange={e => { if (e.target.files?.length) handleCoverImagesUpload(e.target.files); }} 
            />
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
            <div className="space-y-4 mb-4 border border-[#2a2a2a] rounded-xl p-4 bg-[#161616]">
              <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider block">Bottle Options & Pricing</span>
              <div className="space-y-3">
                {(waterBottle.options || []).map((opt, idx) => (
                  <div key={opt.id || idx} className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input 
                        label="Bottle Size / Volume" 
                        placeholder="e.g. 500ml, 1L" 
                        value={opt.ml} 
                        onChange={e => {
                          const updated = [...(waterBottle.options || [])];
                          updated[idx] = { ...updated[idx], ml: e.target.value };
                          setWaterBottle(w => ({ ...w, options: updated }));
                        }} 
                      />
                    </div>
                    <div className="w-32">
                      <Input 
                        label="Price" 
                        type="number" 
                        placeholder="20" 
                        value={opt.price} 
                        onChange={e => {
                          const updated = [...(waterBottle.options || [])];
                          updated[idx] = { ...updated[idx], price: Number(e.target.value) || 0 };
                          setWaterBottle(w => ({ ...w, options: updated }));
                        }} 
                        suffix={restaurant?.currency ?? '₹'}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = (waterBottle.options || []).filter((_, i) => i !== idx);
                        setWaterBottle(w => ({ ...w, options: updated }));
                      }}
                      className="text-[#ef4444] hover:text-red-400 text-xs pb-3 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newOpt = { id: 'opt-' + Math.random().toString(36).substring(2, 7), ml: '', price: 0 };
                  setWaterBottle(w => ({ ...w, options: [...(w.options || []), newOpt] }));
                }}
                className="text-xs font-semibold text-[#22c55e] hover:underline flex items-center gap-1 mt-2"
              >
                + Add Water Option
              </button>
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
        <Button variant="danger" fullWidth className="mt-4" disabled={deleteConfirm !== 'DELETE'} loading={deletingAccount} onClick={handleDeleteAccount}>
          Delete Everything
        </Button>
      </Modal>
    </div>
  );
}
