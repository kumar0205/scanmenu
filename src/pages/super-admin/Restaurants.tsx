import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Plus, Store, Check, X, 
  ExternalLink, Edit, Trash2, Eye
} from 'lucide-react';
import { 
  collection, getDocs, doc, updateDoc, deleteDoc, addDoc, Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';

interface RestaurantItem {
  id: string;
  name: string;
  slug: string;
  phone: string;
  address: string;
  status: string;
  plan: string;
  ownerName?: string;
  ownerEmail?: string;
  qrEnabled?: boolean;
  deliveryEnabled?: boolean;
  ordersToday?: number;
  revenueToday?: number;
  createdAt?: any;
}

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState<RestaurantItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<RestaurantItem | null>(null);

  // Edit / Add Form States
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOwnerName, setFormOwnerName] = useState('');
  const [formOwnerEmail, setFormOwnerEmail] = useState('');
  const [formQrEnabled, setFormQrEnabled] = useState(true);
  const [formDeliveryEnabled, setFormDeliveryEnabled] = useState(true);
  const [formStatus, setFormStatus] = useState('active');

  const fetchRestaurants = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'restaurants'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || '',
          slug: data.slug || '',
          phone: data.phone || '',
          address: data.address || '',
          status: data.status || 'active',
          plan: data.plan || 'free',
          ownerName: data.ownerName || 'Guest Owner',
          ownerEmail: data.ownerEmail || '',
          qrEnabled: data.qrEnabled !== undefined ? data.qrEnabled : true,
          deliveryEnabled: data.deliveryEnabled !== undefined ? data.deliveryEnabled : true,
          ordersToday: data.ordersToday || Math.floor(Math.random() * 15) + 2, // Mock fallback
          revenueToday: data.revenueToday || Math.floor(Math.random() * 3500) + 400, // Mock fallback
          createdAt: data.createdAt,
        } as RestaurantItem;
      });
      setRestaurants(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load restaurants.');
      // Mock fallback data for demo representation
      setRestaurants([
        { id: '1', name: 'Taj Biryani Palace', slug: 'taj-biryani', phone: '9876543210', address: 'Jammalamadugu', status: 'active', plan: 'pro', ownerName: 'Rahul', ownerEmail: 'rahul@gmail.com', qrEnabled: true, deliveryEnabled: true, ordersToday: 24, revenueToday: 8500, createdAt: Timestamp.now() },
        { id: '2', name: 'Sharma Dhaba', slug: 'sharma-dhaba', phone: '9876501234', address: 'Main Road', status: 'active', plan: 'business', ownerName: 'Aman', ownerEmail: 'aman@gmail.com', qrEnabled: true, deliveryEnabled: false, ordersToday: 12, revenueToday: 4200, createdAt: Timestamp.now() },
        { id: '3', name: 'Chennai Corner', slug: 'chennai-corner', phone: '9554433221', address: 'Station Road', status: 'inactive', plan: 'free', ownerName: 'Karthik', ownerEmail: 'karthik@gmail.com', qrEnabled: false, deliveryEnabled: true, ordersToday: 0, revenueToday: 0, createdAt: Timestamp.now() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const handleOpenView = (rest: RestaurantItem) => {
    setSelectedRest(rest);
    setIsViewOpen(true);
  };

  const handleOpenEdit = (rest: RestaurantItem) => {
    setSelectedRest(rest);
    setFormName(rest.name);
    setFormSlug(rest.slug);
    setFormPhone(rest.phone);
    setFormAddress(rest.address);
    setFormOwnerName(rest.ownerName || '');
    setFormOwnerEmail(rest.ownerEmail || '');
    setFormQrEnabled(rest.qrEnabled ?? true);
    setFormDeliveryEnabled(rest.deliveryEnabled ?? true);
    setFormStatus(rest.status);
    setIsEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedRest) return;
    try {
      const docRef = doc(db, 'restaurants', selectedRest.id);
      const updateData = {
        name: formName,
        slug: formSlug,
        phone: formPhone,
        address: formAddress,
        ownerName: formOwnerName,
        ownerEmail: formOwnerEmail,
        qrEnabled: formQrEnabled,
        deliveryEnabled: formDeliveryEnabled,
        status: formStatus
      };
      await updateDoc(docRef, updateData);
      toast.success('Restaurant details saved successfully.');
      setIsEditOpen(false);
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Failed to update restaurant: ' + err.message);
    }
  };

  const handleCreateRestaurant = async () => {
    if (!formName || !formSlug) {
      toast.error('Name and Slug are required.');
      return;
    }
    try {
      await addDoc(collection(db, 'restaurants'), {
        name: formName,
        slug: formSlug,
        phone: formPhone,
        address: formAddress,
        ownerName: formOwnerName,
        ownerEmail: formOwnerEmail,
        qrEnabled: formQrEnabled,
        deliveryEnabled: formDeliveryEnabled,
        status: 'active',
        plan: 'free',
        createdAt: Timestamp.now()
      });
      toast.success('Restaurant created successfully.');
      setIsAddOpen(false);
      fetchRestaurants();
      // Clear forms
      setFormName('');
      setFormSlug('');
      setFormPhone('');
      setFormAddress('');
      setFormOwnerName('');
      setFormOwnerEmail('');
    } catch (err: any) {
      toast.error('Failed to create restaurant: ' + err.message);
    }
  };

  const handleToggleStatus = async (rest: RestaurantItem) => {
    const nextStatus = rest.status === 'active' ? 'disabled' : 'active';
    try {
      await updateDoc(doc(db, 'restaurants', rest.id), { status: nextStatus });
      toast.success(`Restaurant has been ${nextStatus === 'active' ? 'activated' : 'disabled'}.`);
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Failed to toggle status: ' + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this restaurant? This cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'restaurants', id));
      toast.success('Restaurant deleted successfully.');
      fetchRestaurants();
    } catch (err: any) {
      toast.error('Failed to delete restaurant: ' + err.message);
    }
  };

  const filtered = useMemo(() => {
    return restaurants.filter(r => 
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.slug.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.ownerName && r.ownerName.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [restaurants, searchTerm]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Restaurant Management</h1>
          <p className="text-sm text-gray-500">Add, configure, and monitor restaurant outlets</p>
        </div>
        <button 
          onClick={() => {
            setFormName('');
            setFormSlug('');
            setFormPhone('');
            setFormAddress('');
            setFormOwnerName('');
            setFormOwnerEmail('');
            setFormQrEnabled(true);
            setFormDeliveryEnabled(true);
            setIsAddOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Restaurant</span>
        </button>
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search restaurant by name, slug, owner..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* CARDS LIST GRID */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-100 rounded-3xl h-64 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white border border-dashed border-gray-200 rounded-2xl shadow-sm">
          <Store className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 font-bold text-lg">No restaurants found</p>
          <p className="text-xs text-gray-400 mt-1">Try modifying your search filter keywords.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((rest) => {
            const joinedDate = rest.createdAt?.toDate ? rest.createdAt.toDate().toLocaleDateString() : 'N/A';
            return (
              <div 
                key={rest.id} 
                className="bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col justify-between gap-5 relative overflow-hidden"
              >
                {/* Top header details */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 border border-green-100 shrink-0 font-bold text-xl uppercase">
                      {rest.name.slice(0, 2)}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-extrabold text-gray-900 text-base leading-tight truncate">{rest.name}</h3>
                      <p className="text-xs text-gray-400 truncate mt-0.5">/{rest.slug}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    rest.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {rest.status}
                  </span>
                </div>

                {/* Owner info */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Owner Details</span>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-gray-700 truncate">{rest.ownerName}</p>
                    {rest.ownerEmail && (
                      <span className="text-[10px] text-gray-400">({rest.ownerEmail})</span>
                    )}
                  </div>
                </div>

                {/* Features Badges */}
                <div className="flex gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    rest.qrEnabled 
                      ? 'bg-green-50 border-green-200 text-green-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <span>QR: {rest.qrEnabled ? 'Enabled' : 'Disabled'}</span>
                  </span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors ${
                    rest.deliveryEnabled 
                      ? 'bg-blue-50 border-blue-200 text-blue-700' 
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <span>Delivery: {rest.deliveryEnabled ? 'Enabled' : 'Disabled'}</span>
                  </span>
                </div>

                {/* Performance stats */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-2xl p-3 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Orders Today</span>
                    <span className="text-gray-900 font-extrabold text-base mt-0.5 block">{rest.ordersToday}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[9px] uppercase tracking-wider font-bold">Sales Today</span>
                    <span className="text-gray-900 font-extrabold text-base mt-0.5 block">₹{(rest.revenueToday || 0).toLocaleString()}</span>
                  </div>
                </div>

                {/* Card footer details & actions */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-[10px] text-gray-400 font-medium">Joined {joinedDate}</span>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleOpenView(rest)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-50 rounded-xl transition-all"
                      title="View Details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleOpenEdit(rest)}
                      className="p-2 text-gray-500 hover:text-green-600 hover:bg-gray-50 rounded-xl transition-all"
                      title="Edit config"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleToggleStatus(rest)}
                      className={`p-2 rounded-xl transition-all ${
                        rest.status === 'active' 
                          ? 'text-red-500 hover:bg-red-50 hover:text-red-600' 
                          : 'text-green-600 hover:bg-green-50 hover:text-green-700'
                      }`}
                      title={rest.status === 'active' ? 'Disable Restaurant' : 'Enable Restaurant'}
                    >
                      {rest.status === 'active' ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                    </button>
                    <button 
                      onClick={() => handleDelete(rest.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      title="Delete Outlet"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW MODAL */}
      {isViewOpen && selectedRest && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setIsViewOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center text-green-600 font-extrabold text-2xl uppercase border border-green-100">
                {selectedRest.name.slice(0, 2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedRest.name}</h3>
                <p className="text-sm text-gray-500">/{selectedRest.slug}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-gray-100 pt-4 text-xs">
              <div>
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Owner Name</span>
                <span className="text-gray-800 font-medium text-sm mt-0.5 block">{selectedRest.ownerName}</span>
              </div>
              {selectedRest.ownerEmail && (
                <div>
                  <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Owner Email</span>
                  <span className="text-gray-800 font-medium text-sm mt-0.5 block">{selectedRest.ownerEmail}</span>
                </div>
              )}
              <div>
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Contact Phone</span>
                <span className="text-gray-800 font-medium text-sm mt-0.5 block">{selectedRest.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Address Location</span>
                <span className="text-gray-800 font-medium text-sm mt-0.5 block">{selectedRest.address || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Billing Plan</span>
                <span className="text-gray-800 font-bold text-sm mt-0.5 block capitalize text-purple-700">{selectedRest.plan}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px]">Status</span>
                <span className="text-gray-800 font-medium text-sm mt-0.5 block capitalize">{selectedRest.status}</span>
              </div>
            </div>

            <div className="flex gap-3 justify-end border-t border-gray-100 pt-4">
              <button 
                onClick={() => {
                  window.open(`/${selectedRest.slug}`, '_blank');
                }}
                className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Visit Menu</span>
              </button>
              <button 
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {isEditOpen && selectedRest && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-left">
            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">Edit Restaurant Configuration</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Restaurant Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Slug URL Path</label>
                <input 
                  type="text" 
                  value={formSlug} 
                  onChange={(e) => setFormSlug(e.target.value)}
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
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Outlet Address</label>
                <input 
                  type="text" 
                  value={formAddress} 
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Owner Name</label>
                <input 
                  type="text" 
                  value={formOwnerName} 
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Owner Email</label>
                <input 
                  type="text" 
                  value={formOwnerEmail} 
                  onChange={(e) => setFormOwnerEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div className="flex gap-5 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formQrEnabled} 
                    onChange={(e) => setFormQrEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>QR Dine-In Enabled</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formDeliveryEnabled} 
                    onChange={(e) => setFormDeliveryEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Rider Delivery Enabled</span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Platform Status</label>
                <select 
                  value={formStatus} 
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
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
                Save Config
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl relative text-left">
            <h3 className="text-lg font-extrabold text-gray-900 border-b border-gray-100 pb-3">Onboard New Restaurant</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Restaurant Name</label>
                <input 
                  type="text" 
                  value={formName} 
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
                  }}
                  placeholder="e.g. Hotel Abhiruchi"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Slug URL Path</label>
                <input 
                  type="text" 
                  value={formSlug} 
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="e.g. hotel-abhiruchi"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Contact Phone</label>
                <input 
                  type="text" 
                  value={formPhone} 
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="e.g. 9876543210"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Outlet Address</label>
                <input 
                  type="text" 
                  value={formAddress} 
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="e.g. Jammalamadugu"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Owner Name</label>
                <input 
                  type="text" 
                  value={formOwnerName} 
                  onChange={(e) => setFormOwnerName(e.target.value)}
                  placeholder="e.g. Kumar"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Owner Email Address</label>
                <input 
                  type="text" 
                  value={formOwnerEmail} 
                  onChange={(e) => setFormOwnerEmail(e.target.value)}
                  placeholder="e.g. owner@restaurant.com"
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-shadow"
                />
              </div>

              <div className="flex gap-5 pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formQrEnabled} 
                    onChange={(e) => setFormQrEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>QR Dine-In Enabled</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={formDeliveryEnabled} 
                    onChange={(e) => setFormDeliveryEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <span>Rider Delivery Enabled</span>
                </label>
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
                onClick={handleCreateRestaurant}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Add Outlet
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
