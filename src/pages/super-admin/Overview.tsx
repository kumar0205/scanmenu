import { Store, TrendingUp, ShoppingBag, Activity, Clock, PlusCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

// Mock data for the revenue chart
const revenueData = [
  { name: 'Dec', mrr: 8200 },
  { name: 'Jan', mrr: 9500 },
  { name: 'Feb', mrr: 11200 },
  { name: 'Mar', mrr: 12800 },
  { name: 'Apr', mrr: 14640 },
  { name: 'May', mrr: 15840 },
];

const recentActivity = [
  { id: 1, text: 'Sharma Dhaba upgraded to Pro plan', time: '2 min ago', type: 'upgrade', icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 2, text: "New restaurant 'Taj Biryani' signed up", time: '15 min ago', type: 'signup', icon: PlusCircle, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 3, text: '5 orders placed at Chennai Corner', time: '20 min ago', type: 'order', icon: ShoppingBag, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 4, text: 'Payment received: ₹299 from Hotel Surya', time: '1 hr ago', type: 'payment', icon: CreditCardIcon, color: 'text-emerald-500', bg: 'bg-emerald-100' },
];

function CreditCardIcon(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>
}

export default function Overview() {
  return (
    <div className="space-y-6">
      
      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-gray-600">Total Restaurants</p>
            <Store className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">47</h3>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center">
              ↑ +5 this week
            </span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-gray-600">Monthly Recurring Rev</p>
            <CreditCardIcon className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">₹15,840</h3>
            <span className="text-xs font-medium text-green-600 bg-green-50 px-1.5 py-0.5 rounded-full flex items-center">
              ↑ +₹1,200
            </span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 font-medium">Free: 15 | Pro: 28 | Biz: 4</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-gray-600">Total Orders Today</p>
            <ShoppingBag className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-gray-900">234</h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-2 font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" /> Peak: 7:30 PM - 9:00 PM
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-medium text-gray-600">Platform Health</p>
            <Activity className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <h3 className="text-xl font-bold text-green-600 flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
              </span>
              All Operational
            </h3>
          </div>
          <p className="text-[11px] text-gray-500 mt-3 font-medium">99.8% Uptime · 12,847 APIs today</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* REVENUE CHART */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-6">Revenue Growth (Last 6 Months)</h3>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(val) => `₹${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`₹${value}`, 'MRR']}
                />
                <Line type="monotone" dataKey="mrr" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ACTIVITY FEED */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-800 mb-6">Recent Activity</h3>
          <div className="space-y-6">
            {recentActivity.map((activity) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="flex gap-4">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${activity.bg}`}>
                    <Icon className={`w-4 h-4 ${activity.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-800 font-medium leading-snug cursor-pointer hover:text-green-600">{activity.text}</p>
                    <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* TOP PERFORMING TABLE */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-800">Top Performing Restaurants (This Month)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500 font-semibold border-b border-gray-200">
                <th className="px-6 py-3">Rank</th>
                <th className="px-6 py-3">Restaurant</th>
                <th className="px-6 py-3">Orders</th>
                <th className="px-6 py-3">Revenue</th>
                <th className="px-6 py-3">Plan</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">#1</td>
                <td className="px-6 py-4 font-semibold text-green-700 cursor-pointer">Taj Biryani Palace</td>
                <td className="px-6 py-4 text-gray-600">842</td>
                <td className="px-6 py-4 text-gray-900 font-medium">₹2,42,500</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-md">Business</span></td>
              </tr>
              <tr className="border-b border-gray-100 hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">#2</td>
                <td className="px-6 py-4 font-semibold text-green-700 cursor-pointer">Sharma Dhaba</td>
                <td className="px-6 py-4 text-gray-600">610</td>
                <td className="px-6 py-4 text-gray-900 font-medium">₹1,15,200</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">Pro</span></td>
              </tr>
              <tr className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">#3</td>
                <td className="px-6 py-4 font-semibold text-green-700 cursor-pointer">Chennai Corner</td>
                <td className="px-6 py-4 text-gray-600">430</td>
                <td className="px-6 py-4 text-gray-900 font-medium">₹85,400</td>
                <td className="px-6 py-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md">Pro</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
