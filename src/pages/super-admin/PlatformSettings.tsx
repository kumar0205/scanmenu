import { useState, useEffect } from 'react';
import { 
  DollarSign, Navigation, ShieldAlert, Phone, Save, RefreshCw
} from 'lucide-react';
import { 
  doc, getDoc, setDoc 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';

export default function PlatformSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [platformFee, setPlatformFee] = useState<number>(3);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(40);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [defaultRadius, setDefaultRadius] = useState<number>(5);
  const [supportNumber, setSupportNumber] = useState<string>('9876543210');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const docSnap = await getDoc(doc(db, 'platform', 'settings'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setPlatformFee(Number(data.platformFee) !== undefined ? Number(data.platformFee) : 3);
        setDefaultDeliveryFee(Number(data.defaultDeliveryFee) !== undefined ? Number(data.defaultDeliveryFee) : 40);
        setMaintenanceMode(!!data.maintenanceMode);
        setDefaultRadius(Number(data.defaultRadius) !== undefined ? Number(data.defaultRadius) : 5);
        setSupportNumber(data.supportNumber || '9876543210');
      }
    } catch (err: any) {
      console.error("Error reading platform settings from Firestore:", err);
      toast.error('Failed to load settings from database. Using default fallback configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'platform', 'settings'), {
        platformFee,
        defaultDeliveryFee,
        maintenanceMode,
        defaultRadius,
        supportNumber,
        updatedAt: new Date()
      });
      toast.success('Platform configuration saved successfully.');
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto px-4 py-4">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Platform Settings</h1>
          <p className="text-sm text-gray-500">Configure default commissions, radius parameters, and maintenance states</p>
        </div>
        <button 
          onClick={fetchSettings}
          className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-50 rounded-xl transition-all"
          title="Reload configuration"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SETTINGS CARD */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-6">
        
        {/* Platform Fee input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span>Platform Commission Fee (per order)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
            <input 
              type="number" 
              value={platformFee} 
              onChange={(e) => setPlatformFee(Number(e.target.value))}
              placeholder="3"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <span className="text-[10px] text-gray-400">Fixed rate collected from each restaurant transaction.</span>
        </div>

        {/* Default Delivery Fee input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-green-500" />
            <span>Default Delivery Base Fee</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₹</span>
            <input 
              type="number" 
              value={defaultDeliveryFee} 
              onChange={(e) => setDefaultDeliveryFee(Number(e.target.value))}
              placeholder="40"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <span className="text-[10px] text-gray-400">Standard starting fee for rider deliveries.</span>
        </div>

        {/* Default Radius input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Navigation className="w-4 h-4 text-green-500" />
            <span>Default Service Radius</span>
          </label>
          <div className="relative">
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">KM</span>
            <input 
              type="number" 
              value={defaultRadius} 
              onChange={(e) => setDefaultRadius(Number(e.target.value))}
              placeholder="5"
              className="w-full pl-3 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
            />
          </div>
          <span className="text-[10px] text-gray-400">Default dispatch range parameters for online riders.</span>
        </div>

        {/* Support phone input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
            <Phone className="w-4 h-4 text-green-500" />
            <span>Customer Support Contact Number</span>
          </label>
          <input 
            type="text" 
            value={supportNumber} 
            onChange={(e) => setSupportNumber(e.target.value)}
            placeholder="9876543210"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
          />
          <span className="text-[10px] text-gray-400">Primary phone hotline for customer, restaurant, and rider assistance.</span>
        </div>

        {/* Maintenance Toggle */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-3.5 bg-red-50/50 border border-red-200/50 rounded-2xl">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              <div>
                <span className="text-xs font-bold text-red-700 uppercase tracking-wide block">Maintenance Mode Switch</span>
                <span className="text-[10px] text-red-500 block">Gracefully restrict new order creation during upgrades.</span>
              </div>
            </div>
            <button 
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                maintenanceMode ? 'bg-red-500 justify-end' : 'bg-gray-200 justify-start'
              }`}
            >
              <span className="w-4 h-4 bg-white rounded-full shadow-sm" />
            </button>
          </div>
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button 
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Configuration'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
