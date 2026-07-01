import { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

interface Address {
  id: string;
  title: string;
  name: string;
  phone: string;
  address: string;
  street: string;
  landmark?: string;
  town: string;
  pincode: string;
  latitude?: number;
  longitude?: number;
  isDefault: boolean;
}

interface AddressModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (address: Omit<Address, 'id'> & { id?: string }) => Promise<void>;
  addressToEdit?: Address | null;
  places?: Array<{ place: string; fee: number }>;
}

export function AddressModal({ open, onClose, onSave, addressToEdit, places = [] }: AddressModalProps) {
  const [title, setTitle] = useState('Home');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [street, setStreet] = useState('');
  const [landmark, setLandmark] = useState('');
  const [town, setTown] = useState('');
  const [latitude, setLatitude] = useState<number | undefined>(undefined);
  const [longitude, setLongitude] = useState<number | undefined>(undefined);
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);

  useEffect(() => {
    if (addressToEdit) {
      setTitle(addressToEdit.title);
      setName(addressToEdit.name);
      setPhone(addressToEdit.phone);
      setAddressLine(addressToEdit.address);
      setStreet(addressToEdit.street || '');
      setLandmark(addressToEdit.landmark || '');
      setTown(addressToEdit.town);
      setLatitude(addressToEdit.latitude);
      setLongitude(addressToEdit.longitude);
      setIsDefault(addressToEdit.isDefault);
    } else {
      setTitle('Home');
      setName('');
      setPhone('');
      setAddressLine('');
      setStreet('');
      setLandmark('');
      setTown('');
      setLatitude(undefined);
      setLongitude(undefined);
      setIsDefault(false);
    }
  }, [addressToEdit, open]);

  if (!open) return null;

  async function handleDetectLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude);
        setLongitude(position.coords.longitude);
        setDetecting(false);
        toast.success('Location coordinates captured!');
      },
      (error) => {
        console.error('Error getting location', error);
        toast.error('Could not detect location. Please type manually.');
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return toast.error('Please enter recipient name');
    if (!phone.trim()) return toast.error('Please enter phone number');
    if (!addressLine.trim()) return toast.error('Please enter Door No / House No');
    if (!street.trim()) return toast.error('Please enter Street Name');
    if (!town.trim()) return toast.error('Please select village/town');

    setSaving(true);
    try {
      await onSave({
        id: addressToEdit?.id,
        title: title.trim(),
        name: name.trim(),
        phone: phone.trim(),
        address: addressLine.trim(),
        street: street.trim(),
        landmark: landmark.trim() || undefined,
        town: town.trim(),
        pincode: '',
        latitude,
        longitude,
        isDefault
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save address');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-center items-end">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full h-[85dvh] max-w-[480px] bg-white shadow-2xl flex flex-col z-10 rounded-t-3xl overflow-hidden animate-[slideUp_0.3s_ease-out]">
        <div className="bg-white shrink-0 border-b border-stone-100 pt-3 pb-3">
          <div className="w-10 h-1.5 bg-stone-200 rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between px-5">
            <h3 className="text-lg font-bold text-stone-900 font-display">
              {addressToEdit ? 'Edit Address' : 'Add New Address'}
            </h3>
            <button onClick={onClose} className="h-8 w-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-left">
          {/* Label selector */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Address Label</label>
            <div className="flex gap-2">
              {['Home', 'Work', 'Other'].map((lbl) => (
                <button
                  type="button"
                  key={lbl}
                  onClick={() => setTitle(lbl)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border transition ${
                    title === lbl ? 'bg-amber-500 border-amber-500 text-white shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-55'
                  }`}
                >
                  {lbl === 'Home' ? '🏠 Home' : lbl === 'Work' ? '💼 Work' : '📍 Other'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Name</label>
              <input
                type="text"
                placeholder="Receiver's name"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Phone Number</label>
              <input
                type="tel"
                placeholder="10-digit number"
                value={phone}
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Door No / House No</label>
            <input
              type="text"
              placeholder="e.g. Door No. 4/12, Flat 101"
              value={addressLine}
              onChange={e => setAddressLine(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Street Name</label>
            <input
              type="text"
              placeholder="e.g. Temple Street"
              value={street}
              onChange={e => setStreet(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Landmark (Optional)</label>
            <input
              type="text"
              placeholder="e.g. near Bus Stand"
              value={landmark}
              onChange={e => setLandmark(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-amber-700 uppercase tracking-wide">Village / Town</label>
            <select
              value={town}
              onChange={e => setTown(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-[13px] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-stone-900"
            >
              <option value="">Select Village/Town</option>
              {places.map((p, idx) => (
                <option key={idx} value={p.place}>
                  {p.place}
                </option>
              ))}
            </select>
          </div>

          {/* Geolocation capturing */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-stone-800">Pin precise location coordinates</p>
              <p className="text-[10px] text-stone-500 mt-0.5">
                {latitude && longitude ? `Coordinates: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Improves delivery rider accuracy'}
              </p>
            </div>
            <button
              type="button"
              onClick={handleDetectLocation}
              disabled={detecting}
              className="flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-250 hover:bg-amber-100 transition rounded-lg px-2.5 py-1.5 text-xs font-bold shrink-0 disabled:opacity-50"
            >
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              {detecting ? 'Pinning...' : latitude ? 'Update' : 'Pin Me'}
            </button>
          </div>

          {/* Default address checkbox */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
              className="w-4 h-4 text-amber-600 bg-white border-stone-300 rounded focus:ring-0 cursor-pointer accent-amber-500"
            />
            <span className="text-xs font-semibold text-stone-700">Set as default delivery address</span>
          </label>

          <div className="pt-4 shrink-0">
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              Save Address
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
