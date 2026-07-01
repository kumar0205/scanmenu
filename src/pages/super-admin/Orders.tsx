import { useState, useEffect, useMemo } from 'react';
import { 
  Search, Receipt, Store, Eye, X, RefreshCw
} from 'lucide-react';
import { 
  collectionGroup, getDocs, query, orderBy, limit, Timestamp 
} from 'firebase/firestore';
import { db } from '../../firebase/config';
import { statusBadge } from '../../components/ui/Badge';
import { Badge } from '../../components/ui/Badge';
import toast from 'react-hot-toast';

interface OrderItemType {
  name: string;
  qty: number;
  price: number;
}

interface SuperOrder {
  id: string;
  restaurantId: string;
  restaurantName?: string;
  dailyOrderId?: number | string;
  customerName?: string;
  customerPhone?: string;
  orderType: string;
  tableNumber?: string;
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  items: OrderItemType[];
  createdAt?: any;
  note?: string;
}

export default function Orders() {
  const [orders, setOrders] = useState<SuperOrder[]>([]);
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filters
  const [filterRestaurantId, setFilterRestaurantId] = useState('');
  const [filterOrderType, setFilterOrderType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDate, setFilterDate] = useState(''); // YYYY-MM-DD
  const [filterCustomer, setFilterCustomer] = useState('');

  // Selected Order Modal
  const [selectedOrder, setSelectedOrder] = useState<SuperOrder | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);

  const fetchOrdersAndRestaurants = async () => {
    setLoading(true);
    try {
      // Fetch restaurants for labels map
      const restSnap = await getDocs(query(collectionGroup(db, 'restaurants')));
      const restList = restSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      setRestaurants(restList);
      const restMap = new Map(restList.map((r: any) => [r.id, r.name || 'Restaurant']));

      // Fetch global orders
      const ordersSnap = await getDocs(query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'), limit(150)));
      const list = ordersSnap.docs.map(doc => {
        const data = doc.data();
        
        // Find restaurantId from parent paths (restaurants/restId/orders/orderId)
        const parentPath = doc.ref.parent.parent?.id || '';

        return {
          id: doc.id,
          restaurantId: parentPath,
          restaurantName: restMap.get(parentPath) || 'Taj Biryani Palace',
          dailyOrderId: data.dailyOrderId || doc.id.substring(0, 4).toUpperCase(),
          customerName: data.customerName || 'Walk-In Guest',
          customerPhone: data.customerPhone || '',
          orderType: data.orderType || 'dine-in',
          tableNumber: data.tableNumber || '',
          status: data.status || 'pending',
          paymentStatus: data.paymentStatus || 'unpaid',
          totalAmount: Number(data.totalAmount) || 0,
          items: data.items || [],
          createdAt: data.createdAt,
          note: data.note || ''
        } as SuperOrder;
      });
      setOrders(list);
    } catch (err: any) {
      console.error(err);
      toast.error('Failed to load global orders list.');
      // Mock fallback representation for support view
      setOrders([
        { id: 'or1', restaurantId: '1', restaurantName: 'Taj Biryani Palace', dailyOrderId: '01', customerName: 'Raman Prasad', customerPhone: '9876543210', orderType: 'delivery', status: 'out_for_delivery', paymentStatus: 'paid', totalAmount: 450, items: [{ name: 'Chicken Biryani', qty: 2, price: 200 }, { name: 'Sprite 250ml', qty: 1, price: 50 }], createdAt: Timestamp.now(), note: 'Make it extra spicy.' },
        { id: 'or2', restaurantId: '2', restaurantName: 'Sharma Dhaba', dailyOrderId: '04', customerName: 'Geeta Sen', customerPhone: '9554433221', orderType: 'dine-in', tableNumber: '5', status: 'preparing', paymentStatus: 'unpaid', totalAmount: 220, items: [{ name: 'Butter Naan', qty: 3, price: 40 }, { name: 'Paneer Butter Masala', qty: 1, price: 100 }], createdAt: Timestamp.now() },
        { id: 'or3', restaurantId: '1', restaurantName: 'Taj Biryani Palace', dailyOrderId: '02', customerName: 'Karan Sharma', customerPhone: '9876501234', orderType: 'dine-in', tableNumber: '1', status: 'completed', paymentStatus: 'paid', totalAmount: 180, items: [{ name: 'Veg Fried Rice', qty: 1, price: 150 }, { name: 'Limca', qty: 1, price: 30 }], createdAt: Timestamp.now() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersAndRestaurants();
  }, []);

  const handleOpenDetails = (order: SuperOrder) => {
    setSelectedOrder(order);
    setIsViewOpen(true);
  };

  const filtered = useMemo(() => {
    return orders.filter(o => {
      // 1. Search text filter
      const matchesSearch = 
        String(o.dailyOrderId).toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.customerName && o.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        o.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      // 2. Restaurant filter
      if (filterRestaurantId && o.restaurantId !== filterRestaurantId) return false;

      // 3. Order Type filter
      if (filterOrderType && o.orderType !== filterOrderType) return false;

      // 4. Status filter
      if (filterStatus && o.status !== filterStatus) return false;

      // 5. Customer name filter
      if (filterCustomer && (!o.customerName || !o.customerName.toLowerCase().includes(filterCustomer.toLowerCase()))) return false;

      // 6. Date filter
      if (filterDate) {
        const orderDateStr = o.createdAt?.toDate 
          ? o.createdAt.toDate().toISOString().substring(0, 10) 
          : new Date().toISOString().substring(0, 10);
        if (orderDateStr !== filterDate) return false;
      }

      return true;
    });
  }, [orders, searchTerm, filterRestaurantId, filterOrderType, filterStatus, filterCustomer, filterDate]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Master Orders List</h1>
          <p className="text-sm text-gray-500">Track and filter orders across every restaurant for platform support</p>
        </div>
        <button 
          onClick={fetchOrdersAndRestaurants}
          className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:bg-gray-50 rounded-xl text-xs font-bold text-gray-700 uppercase tracking-wider transition-colors shadow-sm"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh List</span>
        </button>
      </div>

      {/* FILTERS & SEARCH BAR */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm space-y-4">
        
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search order by order number, customer name, items..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:bg-white transition-all placeholder:text-gray-400"
          />
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 text-xs font-bold text-gray-600 uppercase tracking-wider">
          
          {/* Restaurant filter */}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Restaurant</label>
            <select 
              value={filterRestaurantId}
              onChange={(e) => setFilterRestaurantId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs"
            >
              <option value="">All Restaurants</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* Customer filter */}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Customer Name</label>
            <input 
              type="text"
              placeholder="e.g. Raman"
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs uppercase"
            />
          </div>

          {/* Order Type filter */}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Order Type</label>
            <select 
              value={filterOrderType}
              onChange={(e) => setFilterOrderType(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs"
            >
              <option value="">All Types</option>
              <option value="dine-in">Dine-In</option>
              <option value="delivery">Delivery</option>
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border-none rounded-xl text-xs"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="accepted">Accepted</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="out_for_delivery">Out for Delivery</option>
              <option value="delivered">Delivered</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Date filter */}
          <div>
            <label className="block text-[10px] text-gray-400 mb-1">Date</label>
            <input 
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full px-3 py-1.5 bg-gray-50 border-none rounded-xl text-xs text-gray-700"
            />
          </div>

        </div>
      </div>

      {/* ORDERS DATA TABLE */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[10px] uppercase tracking-wider text-gray-400 font-bold border-b border-gray-100">
                <th className="px-6 py-4">Order ID</th>
                <th className="px-6 py-4">Restaurant</th>
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                    Loading global orders log...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-medium">
                    No matching orders found.
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  return (
                    <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-extrabold text-gray-900">#{order.dailyOrderId}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">{order.id.substring(0, 8)}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-700 font-semibold">
                          <Store className="w-3.5 h-3.5 text-gray-400" />
                          <span>{order.restaurantName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-semibold text-gray-800">{order.customerName}</p>
                          {order.customerPhone && (
                            <p className="text-[10px] text-gray-400 font-mono mt-0.5">{order.customerPhone}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          order.orderType === 'delivery' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {order.orderType === 'delivery' ? 'Delivery' : `Dine-In (${order.tableNumber || 'Takeaway'})`}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-gray-950">₹{order.totalAmount}</td>
                      <td className="px-6 py-4">
                        <Badge variant={statusBadge(order.status)} className="text-[10px] py-0 px-2 uppercase font-bold leading-normal">
                          {order.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleOpenDetails(order)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-green-50 text-gray-700 hover:text-green-700 rounded-xl transition-all font-bold text-[10px] border border-gray-100 uppercase tracking-wide"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL MODAL */}
      {isViewOpen && selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 shadow-2xl relative text-left">
            <button 
              onClick={() => setIsViewOpen(false)}
              className="absolute right-4 top-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Header info */}
            <div className="border-b border-gray-100 pb-3">
              <h3 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-green-500" />
                <span>Order #{selectedOrder.dailyOrderId} details</span>
              </h3>
              <p className="text-xs text-gray-400 mt-1">Global ID: {selectedOrder.id}</p>
            </div>

            {/* General specs */}
            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-750">
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-0.5">Outlet</span>
                <span className="text-gray-900 font-bold flex items-center gap-1"><Store className="w-3.5 h-3.5 text-gray-400" /> {selectedOrder.restaurantName}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-0.5">Order Type</span>
                <span className="text-gray-900 font-bold capitalize">{selectedOrder.orderType} {selectedOrder.tableNumber && `· Table ${selectedOrder.tableNumber}`}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-0.5">Customer details</span>
                <span className="text-gray-900 font-bold">{selectedOrder.customerName} {selectedOrder.customerPhone && `(${selectedOrder.customerPhone})`}</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 block uppercase font-bold tracking-wider mb-0.5">Payment status</span>
                <span className="text-gray-900 font-bold uppercase">{selectedOrder.paymentStatus}</span>
              </div>
            </div>

            {/* Special Instruction */}
            {selectedOrder.note && (
              <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-3 text-xs">
                <span className="font-bold text-amber-700 block mb-1">Customer Note:</span>
                <p className="text-gray-600 font-mono leading-relaxed">{selectedOrder.note}</p>
              </div>
            )}

            {/* Ordered items listing */}
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Ordered items</span>
              <div className="border border-gray-100 rounded-2xl p-3 space-y-2.5 bg-gray-50">
                {selectedOrder.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-800 font-medium">{item.qty}x {item.name}</span>
                    <span className="text-gray-900 font-bold">₹{item.price * item.qty}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center text-sm font-bold text-gray-900 border-t border-gray-200 pt-2">
                  <span>Grand Total</span>
                  <span>₹{selectedOrder.totalAmount}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-gray-100 pt-4">
              <button 
                onClick={() => setIsViewOpen(false)}
                className="px-4 py-2 bg-gray-950 hover:bg-gray-800 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Dismiss Details
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
