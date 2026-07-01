import { useState, useEffect } from 'react';
import { updateRiderProfile } from '../firebase/riderDb';
import { ProfileCard } from '../components/ProfileCard';
import type { DeliveryBoy } from '../types';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { LogOut, Save, User, Phone, Bike, FileText, MapPin, Loader2, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProfileProps {
  profile: DeliveryBoy | null;
}

export default function Profile({ profile }: ProfileProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicle, setVehicle] = useState('Bike');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [currentTown, setCurrentTown] = useState('');
  const [upiId, setUpiId] = useState('');

  // Sync state if profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.name || '');
      setPhone(profile.phone || '');
      setVehicle(profile.vehicle || 'Bike');
      setVehicleNumber(profile.vehicleNumber || '');
      setCurrentTown(profile.currentTown || '');
      setUpiId(profile.upiId || '');
    }
  }, [profile]);

  if (!profile) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || !profile.uid) return;
    
    setSaving(true);
    try {
      await updateRiderProfile(profile.uid, {
        name,
        phone,
        vehicle,
        vehicleNumber,
        currentTown,
        upiId
      });
      toast.success('Profile updated successfully!');
      setEditing(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      toast.success('Logged out successfully');
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
      toast.error('Failed to log out');
    }
  }

  return (
    <div className="space-y-5 text-left text-premium-text">
      <div>
        <h2 className="text-xl font-extrabold text-premium-text">Rider Profile</h2>
        <p className="text-xs text-premium-muted mt-0.5 font-medium">Manage your vehicle and account details.</p>
      </div>

      <ProfileCard profile={profile} />

      {editing ? (
        <form onSubmit={handleSave} className="bg-premium-card border border-premium-border rounded-[16px] p-5 space-y-4 shadow-premium">
          <h3 className="text-premium-text font-extrabold text-xs uppercase tracking-wider">Edit Information</h3>
          
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-premium-primary" /> Rider Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-premium-primary" /> Phone Number
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary transition"
              />
            </div>

            {/* Vehicle */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-premium-primary" /> Vehicle Type
              </label>
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary cursor-pointer transition"
              >
                <option value="Bike" className="bg-premium-sidebar">Bicycle</option>
                <option value="Motorcycle" className="bg-premium-sidebar">Motorcycle</option>
                <option value="Scooter" className="bg-premium-sidebar">Scooter</option>
                <option value="Car" className="bg-premium-sidebar">Car</option>
              </select>
            </div>

            {/* Vehicle Number */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-premium-primary" /> License Plate
              </label>
              <input
                type="text"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                placeholder="e.g. AP39 DD 1234"
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary transition"
              />
            </div>

            {/* Town */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-premium-primary" /> Current Town
              </label>
              <input
                type="text"
                value={currentTown}
                onChange={(e) => setCurrentTown(e.target.value)}
                placeholder="e.g. Jammalamadugu"
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary transition"
              />
            </div>

            {/* UPI ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-premium-muted uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-premium-primary" /> UPI ID (for collections)
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@upi"
                className="w-full px-3.5 py-2.5 bg-premium-bg border border-premium-border rounded-xl text-premium-text text-xs font-semibold focus:outline-none focus:border-premium-primary transition"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-premium-success hover:bg-green-600 disabled:opacity-50 text-premium-bg font-extrabold text-xs py-3 rounded-xl transition flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 border border-premium-border text-premium-text font-extrabold text-xs py-3 rounded-xl hover:bg-premium-hover transition min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-3.5 select-none">
          <button
            onClick={() => setEditing(true)}
            className="w-full bg-premium-card hover:bg-premium-hover text-premium-text border border-premium-border font-extrabold text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-1.5 min-h-[48px] shadow-premium"
          >
            Edit Profile Config
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-premium-danger/10 hover:bg-premium-danger/15 text-premium-danger border border-premium-danger/25 font-extrabold text-xs py-3.5 rounded-2xl transition flex items-center justify-center gap-1.5 min-h-[48px]"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
