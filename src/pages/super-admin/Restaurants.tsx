import { Search, Filter, Download, MoreVertical, ExternalLink, LogIn, Store } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase/config';
import toast from 'react-hot-toast';
import { useAuthContext } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import type { Restaurant } from '../../types';

interface RestaurantData {
  id: string;
  name: string;
  phone: string;
  address: string;
  plan: string;
  slug: string;
  createdAt?: Timestamp;
}

export default function Restaurants() {
  const { setRestaurant } = useAuthContext();
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState<RestaurantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    async function fetchRestaurants() {
      try {
        const snap = await getDocs(collection(db, 'restaurants'));
        const list = snap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as RestaurantData));
        setRestaurants(list);
      } catch (err) {
        console.error("Failed to fetch restaurants from Firestore:", err);
        toast.error("Failed to load restaurants from database.");
      } finally {
        setLoading(false);
      }
    }
    fetchRestaurants();
  }, []);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(restaurants.map(r => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const filteredRestaurants = restaurants.filter(r => 
    r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-bold text-gray-900">All Restaurants ({filteredRestaurants.length})</h3>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name, phone..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-60 focus:ring-2 focus:ring-green-500"
            />
          </div>
          
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Filter className="w-4 h-4 text-gray-500" />
            Filter
          </button>
          
          <button className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="w-4 h-4 text-gray-500" />
            Export CSV
          </button>
        </div>
      </div>

      {/* BULK ACTIONS BAR */}
      {selectedIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="text-sm font-medium text-blue-800">{selectedIds.length} restaurants selected</span>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100">Change Plan</button>
            <button className="px-3 py-1.5 bg-white border border-blue-200 rounded-md text-sm font-medium text-blue-700 hover:bg-blue-100">Send Notification</button>
          </div>
        </div>
      )}

      {/* DATA TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                <th className="px-4 py-3 w-10">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500" 
                    onChange={handleSelectAll} 
                    checked={restaurants.length > 0 && selectedIds.length === restaurants.length} 
                  />
                </th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Contact Details</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden xl:table-cell">Joined</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    Loading restaurants...
                  </td>
                </tr>
              ) : filteredRestaurants.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-10 text-center text-gray-500">
                    No restaurants registered in the system yet.
                  </td>
                </tr>
              ) : (
                filteredRestaurants.map((r) => {
                  const mrrVal = r.plan === 'business' ? '₹699' : r.plan === 'pro' ? '₹299' : '₹0';
                  const joinedDate = r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString() : 'N/A';
                  return (
                    <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-green-600 focus:ring-green-500" 
                          checked={selectedIds.includes(r.id)} 
                          onChange={() => handleSelect(r.id)} 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center text-green-700 shrink-0">
                            <Store className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{r.name}</p>
                            <p className="text-xs text-gray-500">{r.id.substring(0, 8)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-800 font-medium">{r.phone || 'N/A'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{r.address || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-md capitalize ${
                          r.plan === 'business' ? 'bg-purple-100 text-purple-700' :
                          r.plan === 'pro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {r.plan || 'Free'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          <span className="text-gray-700">Active</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell text-gray-500 text-xs">
                        <p>{joinedDate}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{mrrVal}</td>
                      <td className="px-4 py-3 text-right relative">
                        <button 
                          onClick={() => setActiveDropdown(activeDropdown === r.id ? null : r.id)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {activeDropdown === r.id && (
                          <div className="absolute right-8 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 text-left">
                            <button 
                              onClick={() => {
                                window.open(`/${r.slug}`, '_blank');
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <ExternalLink className="w-4 h-4 text-gray-400" /> View Live Menu
                            </button>
                            <button 
                              onClick={() => {
                                setRestaurant(r as unknown as Restaurant);
                                navigate('/admin/dashboard');
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <LogIn className="w-4 h-4 text-green-500" /> Access Dashboard
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <span>Showing 1 to {filteredRestaurants.length} of {restaurants.length} entries</span>
        </div>
      </div>
    </div>
  );
}
