import { Search, Filter, Download, MoreVertical, ExternalLink, LogIn, Store } from 'lucide-react';
import { useState } from 'react';

// Mock data
const restaurants = [
  { id: '1', name: 'Taj Biryani Palace', owner: 'Rahul Kumar', phone: '+91 9876543210', location: 'Hyderabad', plan: 'Business', status: 'Active', joined: '12 Jan 2026', lastActive: '2 min ago', mrr: '₹699' },
  { id: '2', name: 'Sharma Dhaba', owner: 'Amit Sharma', phone: '+91 8765432109', location: 'Delhi', plan: 'Pro', status: 'Active', joined: '05 Feb 2026', lastActive: '15 min ago', mrr: '₹299' },
  { id: '3', name: 'Chennai Corner', owner: 'Priya Rajan', phone: '+91 7654321098', location: 'Chennai', plan: 'Pro', status: 'Active', joined: '20 Mar 2026', lastActive: '1 hr ago', mrr: '₹299' },
  { id: '4', name: 'Burger Point', owner: 'Sunny Singh', phone: '+91 6543210987', location: 'Mumbai', plan: 'Free', status: 'Inactive', joined: '01 Apr 2026', lastActive: '3 days ago', mrr: '₹0' },
  { id: '5', name: 'Kerala Spice', owner: 'John Mathews', phone: '+91 5432109876', location: 'Kochi', plan: 'Free', status: 'Active', joined: '15 Apr 2026', lastActive: '5 hrs ago', mrr: '₹0' },
];

export default function Restaurants() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h3 className="text-lg font-bold text-gray-900">All Restaurants ({restaurants.length})</h3>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search name, phone..." 
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
                  <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" onChange={handleSelectAll} checked={selectedIds.length === restaurants.length} />
                </th>
                <th className="px-4 py-3">Restaurant</th>
                <th className="px-4 py-3">Owner / Contact</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 hidden xl:table-cell">Joined</th>
                <th className="px-4 py-3">MRR</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {restaurants.map((r) => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <input type="checkbox" className="rounded border-gray-300 text-green-600 focus:ring-green-500" checked={selectedIds.includes(r.id)} onChange={() => handleSelect(r.id)} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-md bg-green-100 flex items-center justify-center text-green-700 shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.id.padStart(6, '0')}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-800">{r.owner}</p>
                    <p className="text-xs text-gray-500">{r.phone}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{r.location}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-md ${
                      r.plan === 'Business' ? 'bg-purple-100 text-purple-700' :
                      r.plan === 'Pro' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {r.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${r.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`}></span>
                      <span className={r.status === 'Active' ? 'text-gray-700' : 'text-gray-500'}>{r.status}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden xl:table-cell text-gray-500 text-xs">
                    <p>{r.joined}</p>
                    <p className="text-[10px]">Active: {r.lastActive}</p>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{r.mrr}</td>
                  <td className="px-4 py-3 text-right relative">
                    <button 
                      onClick={() => setActiveDropdown(activeDropdown === r.id ? null : r.id)}
                      className="p-1.5 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    {activeDropdown === r.id && (
                      <div className="absolute right-8 top-10 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10 animate-in fade-in zoom-in-95 text-left">
                        <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <ExternalLink className="w-4 h-4 text-gray-400" /> View Live Menu
                        </button>
                        <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                          <LogIn className="w-4 h-4 text-blue-500" /> Login As Owner
                        </button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Change Plan</button>
                        <button className="w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">View Analytics</button>
                        <div className="h-px bg-gray-100 my-1"></div>
                        <button className="w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 font-medium">Deactivate Account</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <span>Showing 1 to 5 of 47 entries</span>
          <div className="flex gap-1">
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-50">Previous</button>
            <button className="px-3 py-1 bg-green-600 text-white rounded-md">1</button>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50">2</button>
            <button className="px-3 py-1 border border-gray-200 rounded-md hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}
