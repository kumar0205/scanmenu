import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Bike, Award, ShoppingBag, X, Check, Edit, Plus, Mail, Key
} from 'lucide-react';
import { 
  collection, getDocs, doc, updateDoc, setDoc, Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';

interface RiderItem {
  id: string;
  name: string;
  phone: string;
  vehicle: string;
  email?: string;
  town?: string;
  isOnline: boolean;
  status: string; // 'active' | 'suspended'
  currentOrderId?: string;
  currentOrderNumber?: string;
  deliveriesToday?: number;
  earningsToday?: number;
  rating?: number;
}

export default function Riders() {
  const [riders, setRiders] = useState<RiderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedRider, setSelectedRider] = useState<RiderItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formVehicle, setFormVehicle] = useState('Bike');
  const [formStatus, setFormStatus] = useState('active');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');

  const fetchRiders = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'deliveryBoys'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Rider',
          phone: data.phone || '',
          vehicle: data.vehicle || 'Bike',
          email: data.email || '',
          town: data.town || '',
          isOnline: data.isOnline || false,
          status: data.status || 'active',
          currentOrderId: data.currentOrderId || '',
          currentOrderNumber: data.currentOrderId ? data.currentOrderId.substring(0, 4).toUpperCase() : '',
          deliveriesToday: data.deliveriesToday || Math.floor(Math.random() * 5), // Mock metric
          earningsToday: data.earningsToday || Math.floor(Math.random() * 300) + 50, // Mock metric
          rating: data.rating || 4.8
        } as RiderItem;
      });
      setRiders(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load riders from database.');
      // Mock riders representation for super admin view
      setRiders([
        { id: 'r1', name: 'Rahul', phone: '9876543210', vehicle: 'Bike', town: 'Jammalamadugu', email: 'rahul@rider.com', isOnline: true, status: 'active', currentOrderId: 'or1', currentOrderNumber: '#01', deliveriesToday: 4, earningsToday: 320, rating: 4.9 },
        { id: 'r2', name: 'Srinivas', phone: '9876501234', vehicle: 'Scooter', town: 'Jammalamadugu', email: 'srinivas@rider.com', isOnline: false, status: 'active', deliveriesToday: 2, earningsToday: 150, rating: 4.7 },
        { id: 'r3', name: 'Venkatesh', phone: '9554433221', vehicle: 'Bike', town: 'Jammalamadugu', email: 'venkatesh@rider.com', isOnline: false, status: 'suspended', deliveriesToday: 0, earningsToday: 0, rating: 4.5 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleOpenAdd = () => {
    setFormName('');
    setFormPhone('');
    setFormVehicle('Bike');
    setFormEmail('');
    setFormPassword('');
    setIsAddOpen(true);
  };

  const handleCreateRider = async () => {
    if (!formName || !formPhone || !formEmail || !formPassword) {
      toast.error('All fields are required to register a rider.');
      return;
    }
    
    setLoading(true);
    let secondaryApp: any;
    try {
      // Create user using secondary app instance so super admin auth session is never disrupted
      const defaultApp = getApps().find(a => a.name === '[DEFAULT]');
      if (!defaultApp) throw new Error('Firebase app not initialized');
      const opts = defaultApp.options;
      const firebaseConfig = {
        apiKey: opts.apiKey,
        authDomain: opts.authDomain,
        projectId: opts.projectId,
        storageBucket: opts.storageBucket,
        messagingSenderId: opts.messagingSenderId,
        appId: opts.appId,
      };

      const appName = `rider-provision-${Date.now()}`;
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      const cred = await createUserWithEmailAndPassword(secondaryAuth, formEmail, formPassword);
      const uid = cred.user.uid;

      await signOut(secondaryAuth);

      // Create documents
      // 1. users/{uid}
      await setDoc(doc(db, 'users', uid), {
        role: 'rider',
        email: formEmail,
        displayName: formName,
        createdAt: Timestamp.now()
      });

      // 2. deliveryBoys/{uid}
      await setDoc(doc(db, 'deliveryBoys', uid), {
        uid,
        name: formName,
        phone: formPhone,
        vehicle: formVehicle,
        email: formEmail,
        isOnline: false,
        totalDeliveries: 0,
        totalEarnings: 0,
        status: 'active',
        createdAt: Timestamp.now()
      });

      toast.success('Rider registered successfully.');
      setIsAddOpen(false);
      fetchRiders();
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to register rider: ' + err.message);
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp).catch(() => {});
      }
      setLoading(false);
    }
  };

  const handleOpenEdit = (rider: RiderItem) => {
    setSelectedRider(rider);
    setFormName(rider.name);
    setFormPhone(rider.phone);
    setFormVehicle(rider.vehicle);
    setFormStatus(rider.status);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRider) return;
    try {
      await updateDoc(doc(db, 'deliveryBoys', selectedRider.id), {
        name: formName,
        phone: formPhone,
        vehicle: formVehicle,
        status: formStatus
      });
      toast.success('Rider details saved successfully.');
      setIsEditOpen(false);
      fetchRiders();
    } catch (err: any) {
      toast.error('Failed to save details: ' + err.message);
    }
  };

  const handleToggleSuspend = async (rider: RiderItem) => {
    const nextStatus = rider.status === 'active' ? 'suspended' : 'active';
    try {
      await updateDoc(doc(db, 'deliveryBoys', rider.id), { status: nextStatus });
      toast.success(`Rider account has been ${nextStatus === 'active' ? 'activated' : 'suspended'}.`);
      fetchRiders();
    } catch (err: any) {
      toast.error('Failed to change status: ' + err.message);
    }
  };

  const filtered = useMemo(() => {
    return riders.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.phone.includes(searchTerm) ||
      (r.town && r.town.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [riders, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Platform Riders</h1>
          <p className="text-sm text-gray-500">Monitor rider status, vehicles, delivery numbers, and earnings</p>
        </div>
        <button 
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Rider</span>
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search riders by name, phone, town..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* RIDERS CARDS GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-3xl h-56 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm animate-in fade-in">
          <Bike className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">No riders found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((rider) => (
            <div 
              key={rider.id}
              className="bg-white border border-gray-100 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
            >
              {/* Header Status Row */}
              <div className="flex justify-between items-start gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center text-green-600 shrink-0">
                    <Bike className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-gray-900 text-sm leading-tight">{rider.name}</h3>
                    <p className="text-xs text-gray-400 font-mono mt-0.5">{rider.phone}</p>
                  </div>
                </div>

                <div className="flex gap-1.5 items-center">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                    rider.isOnline 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-gray-50 border border-gray-200 text-gray-400'
                  }`}>
                    {rider.isOnline ? 'Online' : 'Offline'}
                  </span>
                  
                  {rider.status === 'suspended' && (
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 border border-red-200 text-red-700 uppercase tracking-wider">
                      Suspended
                    </span>
                  )}
                </div>
              </div>

              {/* Rider specifications */}
              <div className="grid grid-cols-3 gap-2.5 bg-gray-50 rounded-2xl p-3 text-xs font-semibold text-gray-750">
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Vehicle</span>
                  <span className="text-gray-900 font-bold block truncate mt-0.5">{rider.vehicle}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Deliveries</span>
                  <span className="text-gray-900 font-bold block mt-0.5">{rider.deliveriesToday} today</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Earnings</span>
                  <span className="text-gray-900 font-bold block mt-0.5">₹{rider.earningsToday}</span>
                </div>
              </div>

              {/* Current Assigned task */}
              <div className="text-xs font-semibold text-gray-700">
                <span className="text-gray-400 text-[9px] uppercase tracking-wider block font-bold">Active order</span>
                {rider.currentOrderId ? (
                  <p className="mt-0.5 flex items-center gap-1 text-green-600 font-bold">
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Order #{rider.currentOrderNumber}</span>
                  </p>
                ) : (
                  <p className="text-gray-400 font-medium italic mt-0.5">No active assignment</p>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 mt-1">
                <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <Award className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{rider.rating} Rating</span>
                </div>

                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => handleOpenEdit(rider)}
                    className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-gray-50 rounded-lg transition-all"
                    title="Edit Rider"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleToggleSuspend(rider)}
                    className={`p-1.5 rounded-lg transition-all ${
                      rider.status === 'active' 
                        ? 'text-red-500 hover:bg-red-50 hover:text-red-655' 
                        : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                    }`}
                    title={rider.status === 'active' ? 'Suspend Rider' : 'Activate Rider'}
                  >
                    {rider.status === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-left">
            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">Register New Rider</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rider Full Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Ramesh"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input 
                  type="text" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Vehicle Type</label>
                <select 
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="email" 
                    value={formEmail} 
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="rider@scanmenu.com"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input 
                    type="password" 
                    value={formPassword} 
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-5">
              <button 
                onClick={() => setIsAddOpen(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateRider}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Register Rider
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedRider && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-left">
            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">Edit Rider Details</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Rider Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input 
                  type="text" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Vehicle Type</label>
                <select 
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="Bike">Bike</option>
                  <option value="Scooter">Scooter</option>
                  <option value="Bicycle">Bicycle</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">System Status</label>
                <select 
                  value={formStatus} 
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-gray-100 pt-4 mt-5">
              <button 
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Save Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
