import { useState, useRef, useEffect } from 'react';
import {
  Settings as SettingsIcon, Star, Gift, AlertTriangle, Loader2,
  Link2, ExternalLink, Droplets, Bell, X, Plus, Globe,
  Volume2, Play, Square, Trash2, Smartphone, Download, Percent, Users, Copy, CheckCircle, Lock
} from 'lucide-react';

import { Capacitor } from '@capacitor/core';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Toggle } from '../../components/ui/Toggle';
import { Modal } from '../../components/ui/Modal';
import { useAuthContext } from '../../context/AuthContext';
import { useI18n } from '../../context/I18nContext';
import { updateRestaurant, deleteAllMenuItems } from '../../firebase/db';
import { uploadToCloudinary } from '../../utils/cloudinary';
import { usePWA } from '../../hooks/usePWA';
import { provisionStaffAccount, getStaffStatus } from '../../firebase/staffAuth';
import toast from 'react-hot-toast';
import type { Restaurant } from '../../types';


type RewardSettings = Restaurant['rewards'];

export default function Settings() {
  const { restaurant, restaurantId, setRestaurant, isDemo } = useAuthContext();
  const { t, language, setLanguage } = useI18n();
  const [name, setName] = useState(restaurant?.name ?? '');
  const [slug, setSlug] = useState(restaurant?.slug ?? '');
  const [streetArea, setStreetArea] = useState(restaurant?.streetArea ?? '');
  const [town, setTown] = useState(restaurant?.town ?? '');
  const [stateVal, setStateVal] = useState(restaurant?.state ?? '');
  const [phone, setPhone] = useState(restaurant?.phone ?? '');
  const [currency, setCurrency] = useState(restaurant?.currency ?? '₹');
  const [upiId, setUpiId] = useState(restaurant?.upiId ?? '');
  const [upiType, setUpiType] = useState<'merchant' | 'personal'>(restaurant?.upiType ?? 'personal');
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
  const [tax, setTax] = useState(restaurant?.tax ?? {
    cgstEnabled: false,
    cgstPercent: 9,
    sgstEnabled: false,
    sgstPercent: 9,
  });
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

  const [qrEnabled, setQrEnabled] = useState(restaurant?.settings?.ordering?.qr ?? true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(restaurant?.settings?.ordering?.delivery ?? false);
  const [assignmentMode, setAssignmentMode] = useState<'self' | 'owner' | 'hybrid'>(
    (restaurant?.settings?.ordering as any)?.assignmentMode ?? 'self'
  );
  const [manualRiderAssignment, setManualRiderAssignment] = useState(() => {
    return (restaurant?.settings?.ordering as any)?.manualRiderAssignment ?? false;
  });
  const [platformFee, setPlatformFee] = useState(restaurant?.settings?.fees?.platformFee ?? 2);
  const [deliveryFee, setDeliveryFee] = useState(restaurant?.settings?.fees?.deliveryFee ?? 40);
  const [deliveryPlaces, setDeliveryPlaces] = useState<Array<{ place: string; fee: number }>>(
    restaurant?.settings?.delivery?.places || []
  );
  const [newPlaceName, setNewPlaceName] = useState('');
  const [newPlaceFee, setNewPlaceFee] = useState('');
  const [deliveryRadius, setDeliveryRadius] = useState(restaurant?.settings?.delivery?.radius ?? 5);
  const [minimumOrder, setMinimumOrder] = useState(restaurant?.settings?.delivery?.minimumOrder ?? 200);
  const [deliveryZonesStr, setDeliveryZonesStr] = useState((restaurant?.settings?.delivery?.zones ?? []).join(', '));
  const [estimatedDeliveryTime, setEstimatedDeliveryTime] = useState(restaurant?.settings?.delivery?.estimatedDeliveryTime ?? '30-45 mins');
  const [customDomain, setCustomDomain] = useState(restaurant?.settings?.customDomain ?? '');

  // Staff Access state
  const [staffStatus, setStaffStatus] = useState({ chefActive: false, waiterActive: false });
  const [staffSetupRole, setStaffSetupRole] = useState<'chef' | 'waiter' | null>(null);
  const [staffPin, setStaffPin] = useState('');
  const [staffPinConfirm, setStaffPinConfirm] = useState('');
  const [staffSaving, setStaffSaving] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);


  // Custom sound state and refs
  const [soundUrl, setSoundUrl] = useState(restaurant?.notificationSoundUrl ?? '');
  const [soundUploadPct, setSoundUploadPct] = useState<number | null>(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const soundFileRef = useRef<HTMLInputElement>(null);

  // PWA states
  const { isInstallable, isStandalone, installApp, isIOS } = usePWA();

  const origin = Capacitor.isNativePlatform()
    ? (import.meta.env.VITE_APP_BASE_URL || window.location.origin)
    : window.location.origin;

  const menuUrl = `${origin}/${restaurant?.slug}`;

  useEffect(() => {
    if (restaurantId) {
      getStaffStatus(restaurantId).then(setStaffStatus).catch(() => { });
    }
  }, [restaurantId]);

  useEffect(() => {
    if (restaurant) {
      setName(restaurant.name);
      setSlug(restaurant.slug);
      setStreetArea(restaurant.streetArea ?? '');
      setTown(restaurant.town ?? '');
      setStateVal(restaurant.state ?? '');
      setPhone(restaurant.phone);
      setCurrency(restaurant.currency);
      setUpiId(restaurant.upiId ?? '');
      setUpiType(restaurant.upiType ?? 'personal');
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
      if (restaurant.tax) setTax(restaurant.tax);
      if (restaurant.coverImages) setCoverImages(restaurant.coverImages);
      else if (restaurant.coverImageUrl) setCoverImages([restaurant.coverImageUrl]);
      setSoundUrl(restaurant.notificationSoundUrl ?? '');
      if (restaurant.settings) {
        setQrEnabled(restaurant.settings.ordering?.qr ?? true);
        setDeliveryEnabled(restaurant.settings.ordering?.delivery ?? false);
        setAssignmentMode((restaurant.settings.ordering as any)?.assignmentMode ?? 'self');
        setManualRiderAssignment((restaurant.settings.ordering as any)?.manualRiderAssignment ?? false);
        setPlatformFee(restaurant.settings.fees?.platformFee ?? 2);
        setDeliveryFee(restaurant.settings.fees?.deliveryFee ?? 40);
        setDeliveryPlaces(restaurant.settings.delivery?.places || []);
        setDeliveryRadius(restaurant.settings.delivery?.radius ?? 5);
        setMinimumOrder(restaurant.settings.delivery?.minimumOrder ?? 200);
        setDeliveryZonesStr((restaurant.settings.delivery?.zones ?? []).join(', '));
        setEstimatedDeliveryTime(restaurant.settings.delivery?.estimatedDeliveryTime ?? '30-45 mins');
        setCustomDomain(restaurant.settings.customDomain ?? '');
      }
    }
  }, [restaurant]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlaySound = () => {
    if (isPlayingSound && audioRef.current) {
      audioRef.current.pause();
      setIsPlayingSound(false);
    } else if (soundUrl) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      // Only append cache-busting timestamp to network URLs, not base64 data URLs
      const cacheBusterUrl = soundUrl.startsWith('data:')
        ? soundUrl
        : (soundUrl.includes('?') ? `${soundUrl}&t=${Date.now()}` : `${soundUrl}?t=${Date.now()}`);

      const audio = new Audio();
      audio.crossOrigin = "anonymous";
      audio.preload = "auto";
      audio.src = cacheBusterUrl;
      audio.volume = 1.0;

      audioRef.current = audio;
      setIsPlayingSound(true);

      audio.onerror = (e) => {
        console.error("Audio element error during preview:", e);
        toast.error("Failed to load audio preview. Format might not be supported or network error.");
        setIsPlayingSound(false);
      };

      audio.play().catch((err) => {
        console.error("Preview failed:", err);
        setIsPlayingSound(false);
      });
      audio.onended = () => {
        setIsPlayingSound(false);
      };
    }
  };

  async function handleSoundUpload(file: File) {
    if (isDemo) {
      toast.success('Sound upload skipped in demo mode');
      return;
    }
    if (!restaurantId) return;

    // Limit file size to 800KB to ensure it fits comfortably within Firestore's 1MB document size limit
    if (file.size > 800 * 1024) {
      toast.error('Sound file is too large. Please upload an audio file under 800KB.');
      return;
    }

    setSoundUploadPct(10);
    try {
      const reader = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
      });

      setSoundUploadPct(50);
      await updateRestaurant(restaurantId, { notificationSoundUrl: dataUrl });

      setSoundUploadPct(80);
      setRestaurant({ ...restaurant!, notificationSoundUrl: dataUrl });
      setSoundUrl(dataUrl);

      setSoundUploadPct(100);
      toast.success('Notification sound uploaded successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to process sound file. Please try again.');
    } finally {
      setTimeout(() => setSoundUploadPct(null), 500);
    }
  }

  async function handleRemoveSound() {
    if (isDemo) {
      toast.success('Sound removal skipped in demo mode');
      return;
    }
    if (!restaurantId) return;
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsPlayingSound(false);
      }
      await updateRestaurant(restaurantId, { notificationSoundUrl: '' });
      setRestaurant({ ...restaurant!, notificationSoundUrl: '' });
      setSoundUrl('');
      toast.success('Notification sound removed');
    } catch {
      toast.error('Failed to remove notification sound');
    }
  }

  const handleAddDeliveryPlace = () => {
    const nameStr = newPlaceName.trim();
    const feeVal = Number(newPlaceFee);
    if (!nameStr) {
      toast.error("Place name is required");
      return;
    }
    if (isNaN(feeVal) || feeVal < 0) {
      toast.error("Valid delivery fee is required");
      return;
    }
    if (deliveryPlaces.some(p => p.place.toLowerCase() === nameStr.toLowerCase())) {
      toast.error("This place is already configured");
      return;
    }
    setDeliveryPlaces(prev => [...prev, { place: nameStr, fee: feeVal }]);
    setNewPlaceName('');
    setNewPlaceFee('');
  };

  async function saveInfo() {
    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    if (!cleanSlug) {
      toast.error("URL Slug cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const computedAddress = [streetArea.trim(), town.trim(), stateVal.trim()].filter(Boolean).join(', ');
      const cleanZones = deliveryZonesStr
        .split(',')
        .map(z => z.trim())
        .filter(Boolean);

      let cleanedDomain = customDomain.trim().toLowerCase();
      if (cleanedDomain) {
        try {
          if (cleanedDomain.includes('://')) {
            const urlObj = new URL(cleanedDomain);
            cleanedDomain = urlObj.hostname;
          } else {
            const firstPart = cleanedDomain.split('/')[0];
            cleanedDomain = firstPart.split(':')[0];
          }
        } catch (e) {
          cleanedDomain = cleanedDomain.replace(/https?:\/\//, '').split('/')[0].split(':')[0];
        }
      }

      const settingsPayload = {
        ordering: {
          qr: qrEnabled,
          delivery: deliveryEnabled,
          assignmentMode: assignmentMode,
          manualRiderAssignment: manualRiderAssignment
        },
        fees: {
          platformFee: Number(platformFee),
          deliveryFee: Number(deliveryFee)
        },
        delivery: {
          radius: Number(deliveryRadius),
          minimumOrder: Number(minimumOrder),
          zones: cleanZones,
          estimatedDeliveryTime: estimatedDeliveryTime.trim(),
          places: deliveryPlaces
        },
        customDomain: cleanedDomain
      };

      const updated = {
        ...restaurant!,
        name,
        slug: cleanSlug,
        address: computedAddress,
        streetArea,
        town,
        state: stateVal,
        phone,
        currency,
        upiId,
        upiType,
        googleReviewUrl: googleUrl,
        settings: settingsPayload
      };
      if (!isDemo && restaurantId) {
        await updateRestaurant(restaurantId, {
          name,
          slug: cleanSlug,
          address: computedAddress,
          streetArea,
          town,
          state: stateVal,
          phone,
          currency,
          upiId,
          upiType,
          googleReviewUrl: googleUrl,
          settings: settingsPayload
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

  async function saveTax() {
    if (!isDemo && restaurantId) {
      await updateRestaurant(restaurantId, { tax });
    }
    setRestaurant({ ...restaurant!, tax });
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
      toast.success('Logo uploaded successfully!');
    } catch (err) {
      console.error('Logo upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload logo';
      toast.error(msg);
    } finally {
      setUploadPct(null);
      if (fileRef.current) fileRef.current.value = '';
    }
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
    } catch (err) {
      console.error('Cover upload failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to upload photos';
      toast.error(msg);
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
    <div className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-slate-900 dark:text-premium-text transition-colors duration-200">
      <AdminHeader title={t('header.title.settings')} />
      <div className="p-6 space-y-5 max-w-2xl">
        {/* Restaurant Info */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2 mb-4">
            <SettingsIcon className="w-4 h-4 text-[#22c55e]" /> {t('settings.restaurantInfo')}
          </h3>
          <div className="space-y-4">
            <Input label={t('settings.restaurantName')} value={name} onChange={e => setName(e.target.value)} />

            <div className="flex flex-col gap-1.5">
              <Input
                label="Table URL Slug"
                value={slug}
                onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                placeholder="e.g. varahi"
              />
              <p className="text-[10px] text-slate-555 dark:text-[#71717a] mt-0.5 leading-relaxed font-semibold">
                The unique slug in your digital menu URL. Preview URL: <span className="text-slate-900 dark:text-premium-text font-bold">{origin}/{slug || 'restaurant'}</span>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Street / Area" value={streetArea} onChange={e => setStreetArea(e.target.value)} />
              <Input label="Town" value={town} onChange={e => setTown(e.target.value)} />
            </div>
            <Input label="State" value={stateVal} onChange={e => setStateVal(e.target.value)} />

            <div className="text-xs text-slate-500 dark:text-premium-muted bg-slate-50 dark:bg-premium-bg p-3 rounded-xl border border-slate-200 dark:border-premium-border flex flex-col gap-1 shadow-sm">
              <div className="flex justify-between items-start">
                <span>Preview address:</span>
                <div className="text-right">
                  <span className="font-bold text-slate-900 dark:text-premium-text">
                    {[streetArea, town].filter(Boolean).join(', ') || 'No address specified'}
                  </span>
                  {stateVal && (
                    <div className="font-bold text-slate-500 dark:text-premium-muted mt-0.5">{stateVal}</div>
                  )}
                </div>
              </div>
            </div>
            <Input label={t('settings.phone')} value={phone} onChange={e => setPhone(e.target.value)} />
            <Input label={t('settings.upiId')} value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="e.g. merchant@upi" />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-premium-muted uppercase tracking-wider">{t('settings.upiType')}</label>
              <select
                className="w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl text-slate-900 dark:text-premium-text px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
                value={upiType}
                onChange={e => setUpiType(e.target.value as 'merchant' | 'personal')}
              >
                <option value="personal" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">{t('settings.upiTypePersonal')}</option>
                <option value="merchant" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">{t('settings.upiTypeMerchant')}</option>
              </select>
              <p className="text-[10px] text-slate-400 dark:text-premium-muted mt-0.5 leading-relaxed font-semibold">
                {upiType === 'personal'
                  ? "Recommended for personal UPI IDs. Prevents payment app rejections by requiring customers to enter the amount manually."
                  : "Use only with registered, verified Merchant UPI IDs that support pre-filled amounts."}
              </p>
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-bold text-slate-500 dark:text-premium-muted uppercase tracking-wider">{t('settings.currency')}</label>
              <select
                className="w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl text-slate-900 dark:text-premium-text px-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#22c55e] transition"
                value={currency}
                onChange={e => setCurrency(e.target.value)}
              >
                <option value="₹" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">₹ INR</option>
                <option value="$" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">$ USD</option>
                <option value="£" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">£ GBP</option>
                <option value="€" className="bg-white dark:bg-premium-sidebar text-slate-900 dark:text-premium-text">€ EUR</option>
              </select>
            </div>

            {/* Delivery & QR Ordering Settings Card */}
            <div className="bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-premium-border rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-slate-950 dark:text-white text-base border-b border-slate-200 dark:border-[#2a2a2a] pb-2.5 flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#22c55e]" /> Ordering &amp; Delivery Settings
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-3 rounded-lg border border-slate-200 dark:border-[#2a2a2a] shadow-sm">
                  <span className="text-xs font-bold text-slate-700 dark:text-[#a1a1aa]">Enable QR Dine-In Ordering</span>
                  <Toggle checked={qrEnabled} onChange={setQrEnabled} />
                </div>
                <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-3 rounded-lg border border-slate-200 dark:border-[#2a2a2a] shadow-sm">
                  <span className="text-xs font-bold text-slate-700 dark:text-[#a1a1aa]">Enable Online Delivery</span>
                  <Toggle checked={deliveryEnabled} onChange={setDeliveryEnabled} />
                </div>
                {deliveryEnabled && (
                  <div className="flex justify-between items-center bg-white dark:bg-[#1a1a1a] p-3 rounded-lg border border-slate-200 dark:border-[#2a2a2a] shadow-sm">
                    <span className="text-xs font-bold text-slate-700 dark:text-[#a1a1aa]">Manual Rider Assignment</span>
                    <Toggle checked={manualRiderAssignment} onChange={setManualRiderAssignment} />
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Input
                  label="Custom Domain (e.g. aahajmd.com)"
                  value={customDomain}
                  onChange={e => setCustomDomain(e.target.value)}
                  placeholder="e.g. aahajmd.com"
                />
                <p className="text-[11px] text-[#52525b] mt-1 text-left">
                  Map your own custom domain or development hostname here. If anyone opens the root domain, they will land directly in your delivery page.
                </p>
              </div>

              {deliveryEnabled && (
                <>
                  <div className="flex flex-col gap-3 py-3 border-t border-[#2a2a2a]">
                    <div className="flex flex-col text-left">
                      <span className="text-sm font-semibold text-[#a1a1aa]">Rider Assignment Mode</span>
                      <span className="text-[10px] text-[#71717a] max-w-[400px] mt-0.5 leading-relaxed">
                        • <strong>Self Assignment:</strong> Riders self-claim ready orders.<br />
                        • <strong>Owner Assignment:</strong> Owners manually choose a rider for each order.<br />
                        • <strong>Hybrid:</strong> Owners have 30 seconds to manually assign a rider, after which riders can self-claim.
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mt-1 select-none">
                      {(['self', 'owner', 'hybrid'] as const).map(mode => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => setAssignmentMode(mode)}
                          className={`py-2 px-3 rounded-lg border font-bold text-xs capitalize transition ${
                            assignmentMode === mode
                              ? 'bg-[#22c55e]/10 border-[#22c55e] text-[#22c55e]'
                              : 'bg-white dark:bg-[#181818] border-slate-200 dark:border-[#2a2a2a] text-slate-500 dark:text-[#a1a1aa] hover:text-slate-900 dark:hover:text-white hover:bg-slate-50'
                          }`}
                        >
                          {mode} Mode
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-200 dark:border-[#2a2a2a]">
                    <Input
                      label="Delivery Fee"
                      type="number"
                      value={deliveryFee}
                      onChange={e => setDeliveryFee(Number(e.target.value))}
                    />
                    <Input
                      label="Platform Fee"
                      type="number"
                      value={platformFee}
                      onChange={e => setPlatformFee(Number(e.target.value))}
                    />
                    <Input
                      label="Delivery Radius (in km)"
                      type="number"
                      value={deliveryRadius}
                      onChange={e => setDeliveryRadius(Number(e.target.value))}
                    />
                    <Input
                      label="Minimum Order for Delivery"
                      type="number"
                      value={minimumOrder}
                      onChange={e => setMinimumOrder(Number(e.target.value))}
                    />
                    <Input
                      label="Delivery Zones (comma separated)"
                      value={deliveryZonesStr}
                      onChange={e => setDeliveryZonesStr(e.target.value)}
                      placeholder="e.g. Mydukur, Jammalamadugu"
                    />
                    <Input
                      label="Est. Delivery Time"
                      value={estimatedDeliveryTime}
                      onChange={e => setEstimatedDeliveryTime(e.target.value)}
                      placeholder="e.g. 30-45 mins"
                    />
                  </div>

                  {/* Places & Delivery Fees sub-card */}
                  <div className="bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 mt-4 space-y-3.5 shadow-sm">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-[#a1a1aa] uppercase tracking-wider block">Places &amp; Delivery Fees</span>
                    
                    {deliveryPlaces.length === 0 ? (
                      <p className="text-xs text-slate-400 dark:text-[#71717a] italic text-left font-semibold">No custom village/town delivery fees configured. Customers will select from these places during checkout.</p>
                    ) : (
                      <div className="space-y-2.5 max-h-[250px] overflow-y-auto pr-1">
                        {deliveryPlaces.map((p, idx) => (
                          <div key={idx} className="flex gap-3 items-center bg-slate-50 dark:bg-[#111111] p-2.5 rounded-lg border border-slate-200 dark:border-[#2a2a2a]">
                            <div className="flex-1 text-left">
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">{p.place}</span>
                              <span className="text-[10px] text-slate-500 dark:text-[#71717a] font-semibold">Fee: {currency}{p.fee}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setDeliveryPlaces(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="text-[#ef4444] hover:text-red-400 text-xs font-bold px-2 py-1 border border-transparent hover:border-[#ef4444]/30 rounded transition"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Form to add a new place */}
                    <div className="flex gap-2.5 items-end pt-2 border-t border-slate-200 dark:border-[#2a2a2a]/50">
                      <div className="flex-1 text-left">
                        <label className="text-[10px] text-slate-500 dark:text-[#71717a] font-bold uppercase tracking-wider">Village / Town Name</label>
                        <input
                          type="text"
                          placeholder="e.g. RK Valley"
                          value={newPlaceName}
                          onChange={e => setNewPlaceName(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#22c55e] mt-1 font-semibold"
                        />
                      </div>
                      <div className="w-24 text-left">
                        <label className="text-[10px] text-slate-500 dark:text-[#71717a] font-bold uppercase tracking-wider">Fee ({currency})</label>
                        <input
                          type="number"
                          placeholder="30"
                          value={newPlaceFee}
                          onChange={e => setNewPlaceFee(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-[#22c55e] mt-1 font-semibold"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleAddDeliveryPlace}
                        className="bg-[#22c55e] hover:bg-[#16a34a] text-white font-bold text-xs px-3.5 py-2 rounded-lg transition"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </>
              )}
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
                  className={`p-3 rounded-lg border text-left transition-all duration-200 flex flex-col gap-1 ${isSelected
                      ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e] dark:text-white'
                      : 'border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#1a1a1a] text-slate-500 dark:text-[#a1a1aa] hover:border-slate-350 dark:hover:border-[#52525b] hover:text-slate-900 dark:hover:text-white'
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
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold mb-4">{t('settings.logo')}</h3>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border overflow-hidden flex items-center justify-center">
              {restaurant?.logoUrl ? (
                <img src={restaurant.logoUrl} alt="logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-slate-400 dark:text-[#52525b] text-xs font-semibold">No logo</span>
              )}
            </div>
            <div className="text-center sm:text-left">
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
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold mb-1">Restaurant Photos</h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">Upload photos of your restaurant to show on the menu header. You can upload multiple photos.</p>

          <div className="flex flex-wrap gap-4 mb-4">
            {coverImages.map((url, idx) => (
              <div key={idx} className="relative w-32 h-24 rounded-lg bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] overflow-hidden group shadow-sm">
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
              className="w-32 h-24 rounded-lg border-2 border-dashed border-slate-350 dark:border-[#2a2a2a] hover:border-premium-primary flex flex-col items-center justify-center gap-1 text-slate-400 dark:text-[#52525b] hover:text-premium-primary transition-colors"
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

        {/* Custom Notification Sound */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-[#22c55e]" /> Order Notification Sound
          </h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">
            Upload a custom sound file to play when a new order is received. Plays at maximum volume.
          </p>

          <div className="space-y-4">
            {soundUrl ? (
              <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-4 flex items-center justify-between flex-wrap gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#22c55e]/10 border border-[#22c55e]/20 text-[#22c55e] rounded-lg shrink-0">
                    <Volume2 className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-slate-900 dark:text-white text-sm font-bold block">Custom Notification Sound Active</span>
                    <span className="text-slate-500 dark:text-[#52525b] text-xs font-semibold">Maximum volume enabled</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlaySound}
                    className="flex items-center gap-1.5 border border-[#2a2a2a] hover:border-[#22c55e] text-white hover:text-[#22c55e] text-xs px-3 py-2 rounded-lg transition-all"
                  >
                    {isPlayingSound ? (
                      <>
                        <Square className="w-3.5 h-3.5 fill-current text-white shrink-0" /> Stop Preview
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current text-white shrink-0" /> Play Preview
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleRemoveSound}
                    className="flex items-center gap-1.5 border border-[#2a2a2a] hover:border-[#ef4444] text-[#a1a1aa] hover:text-[#ef4444] text-xs px-3 py-2 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-[#a1a1aa]" /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="border border-dashed border-slate-350 dark:border-[#2a2a2a] hover:border-premium-primary rounded-xl p-6 text-center cursor-pointer transition-colors"
                onClick={() => soundFileRef.current?.click()}
              >
                <Volume2 className="w-8 h-8 text-slate-400 dark:text-[#52525b] mx-auto mb-2" />
                <span className="text-sm font-bold text-slate-900 dark:text-white block">Upload Notification Sound</span>
                <span className="text-slate-500 dark:text-[#52525b] text-xs font-semibold">Click to browse your device. MP3, WAV, M4A up to 10MB</span>
              </div>
            )}

            {soundUploadPct !== null && (
              <div className="flex items-center gap-2 text-sm text-[#a1a1aa] bg-[#161616] border border-[#2a2a2a] p-3 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin text-[#22c55e]" />
                Uploading Sound File: {soundUploadPct}%
              </div>
            )}

            <input
              ref={soundFileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleSoundUpload(file);
                  e.target.value = '';
                }
              }}
            />
          </div>
        </section>

        {/* Google Business */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-[#22c55e]" /> Google Business Integration
          </h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">Link your Google Business to direct customer ratings to your Google profile.</p>
          <Input
            label="Google Business Review URL"
            placeholder="https://g.page/r/YOUR_BUSINESS_ID/review"
            value={googleUrl}
            onChange={e => setGoogleUrl(e.target.value)}
          />
          <p className="text-slate-400 dark:text-[#52525b] text-[10px] font-semibold mt-2.5">Find your review link in Google Business Profile → Share → Get more reviews</p>
          <Button className="mt-4" onClick={saveGoogle}>{t('generic.save')}</Button>
        </section>

        {/* Rewards */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2">
              <Gift className="w-4 h-4 text-[#22c55e]" /> Customer Rewards
            </h3>
            <Toggle checked={rewards.active} onChange={v => setRewards(r => ({ ...r, active: v }))} />
          </div>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">Configure rewards customers receive when they rate their order.</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Input label="Discount %" type="number" value={String(rewards.discountPercent)} onChange={e => setRewards(r => ({ ...r, discountPercent: Number(e.target.value) }))} suffix="%" />
            <Input label="Discount Label" value={rewards.discountLabel} onChange={e => setRewards(r => ({ ...r, discountLabel: e.target.value }))} />
            <Input label="Dessert Label" value={rewards.dessertLabel} onChange={e => setRewards(r => ({ ...r, dessertLabel: e.target.value }))} />
            <Input label="Dessert Description" value={rewards.dessertDescription} onChange={e => setRewards(r => ({ ...r, dessertDescription: e.target.value }))} />
          </div>
          <div className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-slate-550 dark:text-[#52525b] text-xs mb-3 font-semibold">Preview</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-lg p-3 text-center">
                <p className="text-lg mb-1">💰</p>
                <p className="text-[#22c55e] text-sm font-medium">{rewards.discountLabel}</p>
                <p className="text-slate-550 dark:text-[#52525b] text-xs">Next order</p>
              </div>
              <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-3 text-center shadow-sm">
                <p className="text-lg mb-1">🍰</p>
                <p className="text-slate-900 dark:text-white text-sm font-medium">{rewards.dessertLabel}</p>
                <p className="text-slate-500 dark:text-[#52525b] text-xs font-semibold">{rewards.dessertDescription}</p>
              </div>
            </div>
          </div>
          <Button onClick={saveRewards}>{t('generic.save')}</Button>
        </section>

        {/* Customer Water Requests */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2">
              <Droplets className="w-4 h-4 text-[#22c55e]" /> Customer Water Requests
            </h3>
            <Toggle checked={waterBottle.enabled} onChange={v => setWaterBottle(w => ({ ...w, enabled: v }))} />
          </div>
          <p className="text-slate-550 dark:text-[#52525b] text-xs mb-4 font-semibold">Toggle the "Request Water" button on customer menu. When enabled, customers can request water bottles directly from their table.</p>
          {waterBottle.enabled && (
            <div className="space-y-4 mb-4 border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 bg-slate-50 dark:bg-[#161616] shadow-sm">
              <span className="text-xs font-bold text-slate-500 dark:text-[#a1a1aa] uppercase tracking-wider block">Bottle Options & Pricing</span>
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
        {/* Customer Water Requests Button Suffix */}
          <Button onClick={saveWaterBottle}>{t('generic.save')}</Button>
        </section>

        {/* Call Waiter */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2">
              <Bell className="w-4 h-4 text-[#22c55e]" /> Customer Call Waiter
            </h3>
            <Toggle checked={callWaiter.enabled} onChange={v => setCallWaiter(w => ({ ...w, enabled: v }))} />
          </div>
          <p className="text-slate-550 dark:text-[#52525b] text-xs mb-4 font-semibold">Toggle the "Call Waiter" button on customer menu. When enabled, customers can call a waiter directly from their table.</p>
          <Button onClick={saveCallWaiter}>{t('generic.save')}</Button>
        </section>

        {/* Tax Settings (CGST / SGST) */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2">
              <Percent className="w-4 h-4 text-[#22c55e]" /> Tax Settings (CGST / SGST)
            </h3>
          </div>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-5 font-semibold">Configure GST rates applied on top of order subtotals. Tax is shown as a line-item breakdown on the customer payment page.</p>

          <div className="space-y-4">
            {/* CGST */}
            <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-slate-900 dark:text-white text-sm font-semibold">CGST (Central GST)</p>
                  <p className="text-slate-500 dark:text-[#52525b] text-xs mt-0.5 font-semibold">Central Government tax on goods & services</p>
                </div>
                <Toggle
                  checked={tax.cgstEnabled}
                  onChange={v => setTax(t => ({ ...t, cgstEnabled: v }))}
                />
              </div>
              {tax.cgstEnabled && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      label="CGST Rate"
                      type="number"
                      value={String(tax.cgstPercent)}
                      onChange={e => setTax(t => ({ ...t, cgstPercent: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                      suffix="%"
                    />
                  </div>
                  <div className="mt-5 text-right font-bold">
                    <p className="text-slate-550 dark:text-[#a1a1aa] text-xs">e.g. on ₹100</p>
                    <p className="text-premium-success font-bold text-sm">₹{tax.cgstPercent}</p>
                  </div>
                </div>
              )}
            </div>

            {/* SGST */}
            <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-slate-900 dark:text-white text-sm font-semibold">SGST (State GST)</p>
                  <p className="text-slate-500 dark:text-[#52525b] text-xs mt-0.5 font-semibold">State Government tax on goods & services</p>
                </div>
                <Toggle
                  checked={tax.sgstEnabled}
                  onChange={v => setTax(t => ({ ...t, sgstEnabled: v }))}
                />
              </div>
              {tax.sgstEnabled && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      label="SGST Rate"
                      type="number"
                      value={String(tax.sgstPercent)}
                      onChange={e => setTax(t => ({ ...t, sgstPercent: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                      suffix="%"
                    />
                  </div>
                  <div className="mt-5 text-right font-bold">
                    <p className="text-slate-550 dark:text-[#a1a1aa] text-xs">e.g. on ₹100</p>
                    <p className="text-premium-success font-bold text-sm">₹{tax.sgstPercent}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Live preview */}
            {(tax.cgstEnabled || tax.sgstEnabled) && (
              <div className="bg-white dark:bg-[#0a0a0a] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 shadow-sm">
                <p className="text-slate-550 dark:text-[#52525b] text-xs mb-3 font-semibold uppercase tracking-wider">Preview on ₹1,000 order</p>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-slate-700 dark:text-[#a1a1aa]">
                    <span>Subtotal</span><span>₹1,000.00</span>
                  </div>
                  {tax.cgstEnabled && (
                    <div className="flex justify-between text-slate-700 dark:text-[#a1a1aa]">
                      <span>CGST ({tax.cgstPercent}%)</span>
                      <span>₹{(1000 * tax.cgstPercent / 100).toFixed(2)}</span>
                    </div>
                  )}
                  {tax.sgstEnabled && (
                    <div className="flex justify-between text-slate-700 dark:text-[#a1a1aa]">
                      <span>SGST ({tax.sgstPercent}%)</span>
                      <span>₹{(1000 * tax.sgstPercent / 100).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-900 dark:text-white font-bold border-t border-slate-200 dark:border-[#2a2a2a] pt-2 mt-1">
                    <span>Grand Total</span>
                    <span>₹{(1000 + (tax.cgstEnabled ? 1000 * tax.cgstPercent / 100 : 0) + (tax.sgstEnabled ? 1000 * tax.sgstPercent / 100 : 0)).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Button className="mt-5" onClick={saveTax}>{t('generic.save')}</Button>
        </section>

        {/* Download Admin App */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2 mb-1">
            <Smartphone className="w-4 h-4 text-[#22c55e]" /> Download Admin App
          </h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">
            Install ScanMenu on your phone or tablet for immediate order notifications and a native app experience.
          </p>

          {isStandalone ? (
            <div className="bg-[rgba(34,197,94,0.1)] border border-[rgba(34,197,94,0.2)] rounded-lg p-4 flex items-center gap-3">
              <span className="text-xl">📱</span>
              <div>
                <p className="text-[#22c55e] text-sm font-semibold">App Installed Successfully</p>
                <p className="text-slate-500 dark:text-[#a1a1aa] text-xs font-semibold">You are currently using the standalone application version of ScanMenu.</p>
              </div>
            </div>
          ) : isInstallable ? (
            <div className="space-y-3 text-left">
              <p className="text-slate-500 dark:text-[#a1a1aa] text-xs font-semibold">Get quick access to your admin dashboard directly from your home screen.</p>
              <Button
                onClick={() => {
                  installApp().then(success => {
                    if (success) toast.success("App installed successfully!");
                  });
                }}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4 text-white" /> Download ScanMenu App
              </Button>
            </div>
          ) : isIOS ? (
            <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-4 space-y-2.5 shadow-sm">
              <p className="text-slate-900 dark:text-white text-xs font-bold uppercase tracking-wider">How to install on iOS (iPhone/iPad):</p>
              <ol className="text-xs text-slate-500 dark:text-[#a1a1aa] list-decimal pl-4 space-y-1.5 font-semibold">
                <li>Open this admin page in the <strong className="text-slate-900 dark:text-white">Safari</strong> browser.</li>
                <li>Tap the <strong className="text-slate-900 dark:text-white">Share</strong> button (box with an arrow pointing up) at the bottom or top of your screen.</li>
                <li>Scroll down the list and tap <strong className="text-slate-900 dark:text-white">Add to Home Screen</strong>.</li>
              </ol>
            </div>
          ) : (
            <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-lg p-4 shadow-sm">
              <p className="text-slate-500 dark:text-[#a1a1aa] text-xs font-semibold">
                To download ScanMenu as an app on your mobile device, open this site in your default browser (Chrome on Android or Safari on iOS) and look for the option to install or add to home screen.
              </p>
            </div>
          )}
        </section>

        {/* Staff Access */}
        <section className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-slate-950 dark:text-premium-text font-bold flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-[#22c55e]" /> Staff Access
          </h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-5 font-semibold">
            Give kitchen and waiting staff PIN-based access. They use the Restaurant Code + their PIN to sign in.
          </p>

          {/* Restaurant Code */}
          <div className="bg-slate-50 dark:bg-[#161616] border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 mb-4 shadow-sm">
            <p className="text-slate-500 dark:text-[#a1a1aa] text-xs font-bold uppercase tracking-wider mb-2">Restaurant Code</p>
            <div className="flex items-center gap-3">
              <code className="text-slate-900 dark:text-white font-mono text-lg font-bold flex-1">{restaurant?.slug ?? '—'}</code>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(restaurant?.slug ?? '');
                  setCodeCopied(true);
                  setTimeout(() => setCodeCopied(false), 2000);
                }}
                className="flex items-center gap-1.5 text-xs text-[#22c55e] hover:underline transition-all"
              >
                {codeCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {codeCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <p className="text-slate-400 dark:text-[#52525b] text-[10px] font-semibold mt-2.5">Share this with your kitchen &amp; waiting staff</p>
          </div>

          {/* Chef + Waiter PIN rows */}
          {(['chef', 'waiter'] as const).map(role => {
            const isActive = role === 'chef' ? staffStatus.chefActive : staffStatus.waiterActive;
            const isEditing = staffSetupRole === role;
            const emoji = role === 'chef' ? '👨‍🍳' : '🧑‍🍽️';
            const label = role === 'chef' ? 'Chef' : 'Waiter';

            return (
              <div key={role} className="border border-slate-200 dark:border-[#2a2a2a] rounded-xl p-4 mb-3 bg-slate-50 dark:bg-[#0d0d0d] shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <p className="text-slate-900 dark:text-white text-sm font-bold">{label}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#22c55e]' : 'bg-[#52525b]'}`}
                        />
                        <span className="text-slate-500 dark:text-[#71717a] text-xs font-semibold">
                          {isActive ? 'Active' : 'Not set up'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!isEditing && (
                    <button
                      onClick={() => {
                        setStaffSetupRole(role);
                        setStaffPin('');
                        setStaffPinConfirm('');
                      }}
                      className="text-xs text-[#22c55e] hover:underline font-bold flex items-center gap-1"
                    >
                      <Lock className="w-3 h-3" />
                      {isActive ? 'Change PIN' : 'Set up'}
                    </button>
                  )}
                </div>

                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-[#2a2a2a] space-y-3">
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-[#a1a1aa] block mb-1">
                        {isActive ? 'New PIN' : 'Set PIN'} (4–8 digits)
                      </label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="\d{4,8}"
                        maxLength={8}
                        placeholder="Enter PIN"
                        value={staffPin}
                        onChange={e => setStaffPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white px-4 py-2.5 text-sm font-semibold font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-500 dark:text-[#a1a1aa] block mb-1">Confirm PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={8}
                        placeholder="Confirm PIN"
                        value={staffPinConfirm}
                        onChange={e => setStaffPinConfirm(e.target.value.replace(/\D/g, ''))}
                        className="w-full bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2a2a2a] rounded-lg text-slate-900 dark:text-white px-4 py-2.5 text-sm font-semibold font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#22c55e]"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async () => {
                          if (staffPin.length < 4) { toast.error('PIN must be at least 4 digits'); return; }
                          if (staffPin !== staffPinConfirm) { toast.error('PINs do not match'); return; }
                          if (!restaurantId) return;
                          setStaffSaving(true);
                          try {
                            await provisionStaffAccount(restaurantId, role, staffPin);
                            const updated = await getStaffStatus(restaurantId);
                            setStaffStatus(updated);
                            toast.success(`${label} ${isActive ? 'PIN updated' : 'account created'}!`);
                            setStaffSetupRole(null);
                            setStaffPin('');
                            setStaffPinConfirm('');
                          } catch (err: unknown) {
                            toast.error(err instanceof Error ? err.message : 'Failed to save');
                          } finally {
                            setStaffSaving(false);
                          }
                        }}
                        disabled={staffSaving}
                        className="flex-1 bg-[#22c55e] hover:bg-[#1ea34d] disabled:opacity-50 text-white font-bold text-sm py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        {staffSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        {isActive ? 'Update PIN' : 'Create Account'}
                      </button>
                      <button
                        onClick={() => { setStaffSetupRole(null); setStaffPin(''); setStaffPinConfirm(''); }}
                        className="px-4 py-2 text-sm text-slate-500 dark:text-[#71717a] hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2a2a2a] rounded-lg transition-all font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Danger Zone */}
        <section className="bg-white dark:bg-premium-card border border-[rgba(239,68,68,0.3)] rounded-[16px] p-6 shadow-sm dark:shadow-premium">
          <h3 className="text-[#ef4444] font-bold flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4" /> Danger Zone
          </h3>
          <p className="text-slate-500 dark:text-[#52525b] text-xs mb-4 font-semibold">Permanently delete menu items or your entire restaurant account. This action cannot be undone.</p>
          <div className="flex flex-wrap gap-3 select-none">
            <Button variant="danger" onClick={() => setDeleteItemsModal(true)}>Delete All Menu Items</Button>
            <Button variant="danger" onClick={() => setDeleteModal(true)}>Delete Account</Button>
          </div>
        </section>
      </div>

      <Modal open={deleteItemsModal} onClose={() => setDeleteItemsModal(false)} title="Delete All Menu Items">
        <p className="text-slate-550 dark:text-[#a1a1aa] text-sm mb-4 font-semibold">
          This will permanently delete all menu items in your restaurant. Type <strong className="text-slate-900 dark:text-white font-bold">DELETE ITEMS</strong> to confirm.
        </p>
        <Input placeholder="Type DELETE ITEMS" value={deleteItemsConfirm} onChange={e => setDeleteItemsConfirm(e.target.value)} />
        <Button variant="danger" fullWidth className="mt-4" disabled={deleteItemsConfirm !== 'DELETE ITEMS'} loading={deletingItems} onClick={handleDeleteAllItems}>
          Delete All Items
        </Button>
      </Modal>

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account">
        <p className="text-slate-550 dark:text-[#a1a1aa] text-sm mb-4 font-semibold">
          This will permanently delete your restaurant, menu, orders, and all data. Type <strong className="text-slate-900 dark:text-white font-bold">DELETE</strong> to confirm.
        </p>
        <Input placeholder="Type DELETE" value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} />
        <Button variant="danger" fullWidth className="mt-4" disabled={deleteConfirm !== 'DELETE'} loading={deletingAccount} onClick={handleDeleteAccount}>
          Delete Everything
        </Button>
      </Modal>
    </div>
  );
}
