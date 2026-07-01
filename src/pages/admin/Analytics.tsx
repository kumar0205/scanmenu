import { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  ShoppingBag,
  Clock,
  Activity,
  AlertCircle,
  Award,
  ChevronLeft,
  ChevronRight,
  PieChart as PieChartIcon,
  BarChart2,
  FileText
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { AdminHeader } from '../../components/layout/AdminHeader';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthContext } from '../../context/AuthContext';
import { useAnalyticsStore } from '../../store/useAnalyticsStore';
import { formatCurrency } from '../../utils/formatters';
import type { DayAnalytics, MonthAnalytics } from '../../types';
import * as insightsEngine from '../../utils/analyticsInsights';

// Curated Sleek Premium Color Palette
const COLORS = {
  blue: '#3b82f6',     // Neutral Blue
  green: '#22c55e',    // Positive Green
  orange: '#f59e0b',   // Warning Orange/Yellow
  red: '#ef4444',      // Danger/Warning Red
  neutral: '#52525b',  // Muted Gray
  chartColors: ['#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#6366f1']
};

export default function Analytics() {
  const { restaurantId, restaurant } = useAuthContext();
  const currency = restaurant?.currency ?? '₹';

  // Day, Week, Month view state
  const [activeTab, setActiveTab] = useState<'day' | 'week' | 'month'>('day');

  // Selected date state (defaults to today's date in IST)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const istTime = new Date(Date.now() + (330 * 60000));
    return istTime.toISOString().split('T')[0];
  });

  // Category and Top Items toggle states
  const [catToggle, setCatToggle] = useState<'revenue' | 'items'>('revenue');
  const [itemToggle, setItemToggle] = useState<'count' | 'revenue'>('count');

  // Zustand Store
  const { getDayData, getWeekData, getMonthData, loading } = useAnalyticsStore();

  // Selected Month formatted as YYYY-MM
  const selectedMonth = useMemo(() => selectedDate.slice(0, 7), [selectedDate]);

  // Generate date list for Last 7 Days (Week view)
  const weekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = 6; i >= 0; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  // Generate date list for Previous 7 Days (Week view comparison)
  const prevWeekDates = useMemo(() => {
    const dates = [];
    const baseDate = new Date(selectedDate);
    for (let i = 13; i >= 7; i--) {
      const d = new Date(baseDate.getTime() - i * 24 * 60 * 60 * 1000);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, [selectedDate]);

  // Trigger data fetching on state changes (cached automatically in Zustand store)
  useEffect(() => {
    if (!restaurantId) return;

    if (activeTab === 'day') {
      getDayData(restaurantId, selectedDate);
      // Also fetch yesterday to populate periodComparison insight
      const yesterdayDate = new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000)
        .toISOString().split('T')[0];
      getDayData(restaurantId, yesterdayDate);
    } else if (activeTab === 'week') {
      getWeekData(restaurantId, weekDates);
      getWeekData(restaurantId, prevWeekDates);
    } else if (activeTab === 'month') {
      getMonthData(restaurantId, selectedMonth);
      // Fetch previous month for pacing projection
      const [year, month] = selectedMonth.split('-').map(Number);
      const prevMonthStr = month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
      getMonthData(restaurantId, prevMonthStr);
    }
  }, [restaurantId, activeTab, selectedDate, weekDates, prevWeekDates, selectedMonth]);

  // Resolve Store Data (Zustand state keys)
  const store = useAnalyticsStore.getState();
  const dayData = useMemo(() => store.dayData[selectedDate] || null, [store.dayData, selectedDate]);
  
  const yesterdayDateStr = useMemo(() => {
    return new Date(new Date(selectedDate).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }, [selectedDate]);
  const yesterdayData = useMemo(() => store.dayData[yesterdayDateStr] || null, [store.dayData, yesterdayDateStr]);

  const weekDataArray = useMemo(() => store.weekData[weekDates.join('_')] || [], [store.weekData, weekDates]);
  const prevWeekDataArray = useMemo(() => store.weekData[prevWeekDates.join('_')] || [], [store.weekData, prevWeekDates]);

  const monthData = useMemo(() => store.monthData[selectedMonth] || null, [store.monthData, selectedMonth]);

  const prevMonthStrVal = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    return month === 1 ? `${year - 1}-12` : `${year}-${String(month - 1).padStart(2, '0')}`;
  }, [selectedMonth]);
  const prevMonthData = useMemo(() => store.monthData[prevMonthStrVal] || null, [store.monthData, prevMonthStrVal]);

  // Navigation handlers
  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const adjustMonth = (months: number) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    let newMonth = month + months;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedDate(`${newYear}-${String(newMonth).padStart(2, '0')}-01`);
  };

  // Shared UI components
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm shadow-xl">
        <p className="text-[#a1a1aa] font-medium mb-1">{label}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-white font-semibold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.name === 'This Week' ? COLORS.green : item.name === 'Last Week' ? COLORS.blue : COLORS.blue }} />
            {item.name}: <span className="text-white">{formatCurrency(item.value, currency)}</span>
          </p>
        ))}
      </div>
    );
  };

  const EmptyState = ({ message = "No transactions found during this timeframe." }) => (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
      <div className="w-12 h-12 rounded-full bg-[rgba(82,82,91,0.1)] flex items-center justify-center text-zinc-500 mb-3 animate-pulse">
        <Activity className="w-6 h-6" />
      </div>
      <p className="text-[#a1a1aa] text-sm font-medium">{message}</p>
      <p className="text-[#52525b] text-xs mt-1">Complete more orders to populate analytics.</p>
    </div>
  );

  // ==========================================
  // RENDERING THE TAB VIEWS
  // ==========================================

  return (
    <div className="bg-[#F8FAFC] dark:bg-premium-bg min-h-screen text-slate-900 dark:text-premium-text transition-colors duration-200">
      <AdminHeader title="Restaurant Analytics" />
      
      <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-16">
        
        {/* Toggle navigation and Date Controllers */}
        <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl p-4 shadow-sm dark:shadow-premium">
          {/* Pill Toggle */}
          <div className="flex bg-slate-100 dark:bg-premium-bg rounded-xl p-1 border border-slate-200 dark:border-premium-border self-start md:self-auto">
            {(['day', 'week', 'month'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  // Reset toggles
                  setCatToggle('revenue');
                  setItemToggle('count');
                }}
                className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all duration-150 ${
                  activeTab === tab
                    ? 'bg-[#22c55e] text-white shadow-md'
                    : 'text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Date Picker Controls */}
          <div className="flex items-center gap-3 self-end md:self-auto">
            {activeTab === 'day' && (
              <>
                <button onClick={() => adjustDate(-1)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronLeft className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-premium-text focus:outline-none focus:border-premium-primary"
                />
                <button onClick={() => adjustDate(1)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronRight className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
              </>
            )}

            {activeTab === 'week' && (
              <div className="text-sm font-bold text-slate-500 dark:text-premium-muted flex items-center gap-2">
                <button onClick={() => adjustDate(-7)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronLeft className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
                <span className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-lg px-3 py-1.5 text-slate-900 dark:text-premium-text">
                  Week of {weekDates[0]} to {weekDates[6]}
                </span>
                <button onClick={() => adjustDate(7)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronRight className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
              </div>
            )}

            {activeTab === 'month' && (
              <>
                <button onClick={() => adjustMonth(-1)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronLeft className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
                <span className="bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-lg px-4 py-1.5 text-sm font-semibold text-slate-900 dark:text-premium-text">
                  {new Date(selectedMonth + '-02').toLocaleString('default', { month: 'long', year: 'numeric' })}
                </span>
                <button onClick={() => adjustMonth(1)} className="p-2 rounded-lg bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border hover:bg-slate-100 dark:hover:bg-premium-hover transition-colors"><ChevronRight className="w-4 h-4 text-slate-650 dark:text-premium-text" /></button>
              </>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {((activeTab === 'day' && loading.day) ||
          (activeTab === 'week' && loading.week) ||
          (activeTab === 'month' && loading.month)) ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
              <Skeleton className="h-80 rounded-2xl" />
            </div>
            <Skeleton className="h-48 rounded-2xl" />
          </div>
        ) : (
          <>
            {activeTab === 'day' && (
              <DayViewLayout
                data={dayData}
                yesterday={yesterdayData}
                currency={currency}
                catToggle={catToggle}
                setCatToggle={setCatToggle}
                itemToggle={itemToggle}
                setItemToggle={setItemToggle}
                CustomTooltip={CustomTooltip}
                EmptyState={EmptyState}
              />
            )}

            {activeTab === 'week' && (
              <WeekViewLayout
                data={weekDataArray}
                prevWeekData={prevWeekDataArray}
                currency={currency}
                catToggle={catToggle}
                setCatToggle={setCatToggle}
                itemToggle={itemToggle}
                setItemToggle={setItemToggle}
                CustomTooltip={CustomTooltip}
                EmptyState={EmptyState}
              />
            )}

            {activeTab === 'month' && (
              <MonthViewLayout
                data={monthData}
                prevMonthData={prevMonthData}
                currency={currency}
                catToggle={catToggle}
                setCatToggle={setCatToggle}
                itemToggle={itemToggle}
                setItemToggle={setItemToggle}
                CustomTooltip={CustomTooltip}
                EmptyState={EmptyState}
              />
            )}
          </>
        )}

      </div>
    </div>
  );
}

// ==========================================
// 1. DAY VIEW LAYOUT
// ==========================================
function DayViewLayout({
  data,
  yesterday,
  currency,
  catToggle,
  setCatToggle,
  itemToggle,
  setItemToggle,
  CustomTooltip,
  EmptyState
}: {
  data: DayAnalytics | null;
  yesterday: DayAnalytics | null;
  currency: string;
  catToggle: 'revenue' | 'items';
  setCatToggle: (t: 'revenue' | 'items') => void;
  itemToggle: 'count' | 'revenue';
  setItemToggle: (t: 'count' | 'revenue') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomTooltip: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmptyState: any;
}) {
  const isDocEmpty = !data || (data.completedOrders || 0) === 0;

  // Day Stats calculations
  const totalRevenue = data?.totalRevenue || 0;
  const totalOrders = data?.completedOrders || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const peakHour = data?.peakHour || '--';

  // 1. Hourly Revenue chart parsing
  const hourlyChartData = useMemo(() => {
    if (isDocEmpty) return [];
    const hourly = data.hourlyRevenue || {};
    return Array.from({ length: 24 }).map((_, i) => {
      const hr = String(i).padStart(2, '0');
      return {
        hour: `${hr}:00`,
        Revenue: hourly[hr] || 0
      };
    }).filter(d => d.Revenue > 0 || (i => i >= 8 && i <= 23)(parseInt(d.hour))); // focus restaurant hours
  }, [data, isDocEmpty]);

  // 2. Categories Parsing (Revenue / Items)
  const categoryChartData = useMemo(() => {
    if (isDocEmpty) return [];
    const sourceMap = catToggle === 'revenue' ? data.categoryRevenue || {} : data.categoryItems || {};
    return Object.entries(sourceMap).map(([name, val]) => ({
      name: name.replace(/_/g, '.'),
      value: val
    })).sort((a, b) => b.value - a.value);
  }, [data, catToggle, isDocEmpty]);

  // 3. Top Items Parsing (Count / Revenue)
  const topItemsData = useMemo(() => {
    if (isDocEmpty) return [];
    const sourceMap = itemToggle === 'count' ? data.topItems || {} : data.topItemsRevenue || {};
    return Object.entries(sourceMap).map(([name, val]) => ({
      name: name.replace(/_/g, '.'),
      value: val
    })).sort((a, b) => b.value - a.value).slice(0, 5).reverse(); // reverse for horizontal bars
  }, [data, itemToggle, isDocEmpty]);

  // Smart Insights Generation
  const insights = useMemo(() => {
    if (isDocEmpty) return [];
    const list: insightsEngine.Insight[] = [];

    // Rule 1: Period comparison today vs yesterday
    if (yesterday && yesterday.totalRevenue) {
      const comparison = insightsEngine.getPeriodComparisonInsight(totalRevenue, yesterday.totalRevenue);
      if (comparison) list.push(comparison);
    }

    // Rule 4: Item economics
    const economics = insightsEngine.getItemEconomicsInsight(
      data.topItems || {},
      data.categoryRevenue || {},
      Object.keys(data.topItems || {}).reduce((acc, name) => {
        const qty = data.topItems[name] || 0;
        const rev = data.topItemsRevenue?.[name] || 0;
        acc[name] = qty > 0 ? Math.round(rev / qty) : 0;
        return acc;
      }, {} as Record<string, number>)
    );
    if (economics) list.push(economics);

    return list;
  }, [data, yesterday, totalRevenue, isDocEmpty]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Revenue" value={formatCurrency(totalRevenue, currency)} icon={<DollarSign className="text-emerald-400" />} subtitle="completed orders only" />
        <StatCard title="Total Completed" value={totalOrders} icon={<ShoppingBag className="text-blue-400" />} subtitle={`Orders: ${totalOrders} | Repeat: ${data?.repeatCustomers || 0}`} />
        <StatCard title="Average Order Value" value={formatCurrency(avgOrderValue, currency)} icon={<Activity className="text-purple-400" />} subtitle={`Avg items: ${data?.averageItemsPerOrder || 0} | High: ${formatCurrency(data?.highestSingleOrder || 0, currency)}`} />
        <StatCard title="Peak Hour" value={peakHour} icon={<Clock className="text-amber-400" />} subtitle="hour with highest sales" />
      </div>

      {isDocEmpty ? (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl"><EmptyState /></div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Hourly Revenue Bar Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#22c55e]" /> Hourly Revenue
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="hour" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Revenue" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Donut Chart */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-[#3b82f6]" /> Category Sales
                </h3>
                <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                  <button onClick={() => setCatToggle('revenue')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${catToggle === 'revenue' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                  <button onClick={() => setCatToggle('items')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${catToggle === 'items' ? 'bg-[#3b82f6] text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Qty</button>
                </div>
              </div>
              <div className="h-64 relative flex flex-col justify-center">
                {categoryChartData.length === 0 ? (
                  <EmptyState message="No categories recorded yet." />
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.chartColors[index % COLORS.chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => catToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          iconSize={8}
                          formatter={(value) => <span className="text-[#a1a1aa] text-xs font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Lower Row: Top Items & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Items Horizontal Bar Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" /> Top 5 Selling Items
                </h3>
                <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                  <button onClick={() => setItemToggle('count')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${itemToggle === 'count' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Count</button>
                  <button onClick={() => setItemToggle('revenue')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${itemToggle === 'revenue' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                </div>
              </div>
              <div className="h-64">
                {topItemsData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topItemsData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} width={100} tickLine={false} />
                      <Tooltip formatter={(value) => itemToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                      <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Smart Insights Panel */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl flex flex-col">
              <h3 className="font-semibold text-lg border-b border-[#2a2a2a] pb-3 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Smart Insights
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] scrollbar-none pr-1">
                {insights.length === 0 ? (
                  <EmptyState message="No unusual trends detected today yet." />
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                          insight.tone === 'success' ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.15)] text-[#22c55e]' :
                          insight.tone === 'warning' ? 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.15)] text-[#ef4444]' :
                          insight.tone === 'info' ? 'bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.15)] text-[#3b82f6]' :
                          'bg-[#161616] border-[#2a2a2a] text-[#a1a1aa]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          insight.tone === 'success' ? 'bg-[#22c55e]/15' :
                          insight.tone === 'warning' ? 'bg-[#ef4444]/15' :
                          insight.tone === 'info' ? 'bg-[#3b82f6]/15' :
                          'bg-[#2a2a2a]'
                        }`}>
                          {insight.icon === 'trending-up' && <TrendingUp className="w-4 h-4" />}
                          {insight.icon === 'trending-down' && <TrendingDown className="w-4 h-4" />}
                          {insight.icon === 'calendar' && <Calendar className="w-4 h-4" />}
                          {insight.icon === 'activity' && <Activity className="w-4 h-4" />}
                          {insight.icon === 'dollar-sign' && <DollarSign className="w-4 h-4" />}
                          {insight.icon === 'alert-circle' && <AlertCircle className="w-4 h-4" />}
                          {insight.icon === 'award' && <Award className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold text-sm leading-snug">{insight.title}</h4>
                          <p className="text-[#a1a1aa] text-xs mt-0.5">{insight.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// 2. WEEK VIEW LAYOUT
// ==========================================
function WeekViewLayout({
  data,
  prevWeekData,
  currency,
  catToggle,
  setCatToggle,
  itemToggle,
  setItemToggle,
  CustomTooltip,
  EmptyState
}: {
  data: DayAnalytics[];
  prevWeekData: DayAnalytics[];
  currency: string;
  catToggle: 'revenue' | 'items';
  setCatToggle: (t: 'revenue' | 'items') => void;
  itemToggle: 'count' | 'revenue';
  setItemToggle: (t: 'count' | 'revenue') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomTooltip: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmptyState: any;
}) {
  const isDocEmpty = data.length === 0;

  // Aggregate stats
  const totalRevenue = useMemo(() => data.reduce((sum, d) => sum + (d.totalRevenue || 0), 0), [data]);
  const prevRevenue = useMemo(() => prevWeekData.reduce((sum, d) => sum + (d.totalRevenue || 0), 0), [prevWeekData]);
  const totalOrders = useMemo(() => data.reduce((sum, d) => sum + (d.completedOrders || 0), 0), [data]);
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const revChangePct = useMemo(() => {
    if (!prevRevenue || prevRevenue <= 0) return 0;
    return ((totalRevenue - prevRevenue) / prevRevenue) * 100;
  }, [totalRevenue, prevRevenue]);

  // Find Best Day
  const bestDayObj = useMemo(() => {
    if (isDocEmpty) return { date: '--', revenue: 0 };
    let best = { date: '--', revenue: 0 };
    data.forEach(d => {
      if ((d.totalRevenue || 0) > best.revenue) {
        best = { date: d.date, revenue: d.totalRevenue };
      }
    });
    return best;
  }, [data, isDocEmpty]);

  const repeatCustomers = useMemo(() => {
    let sum = 0;
    data.forEach(d => {
      sum += d.repeatCustomers || 0;
    });
    return sum;
  }, [data]);

  const averageItemsPerOrder = useMemo(() => {
    let sumItems = 0;
    let sumOrders = 0;
    data.forEach(d => {
      sumItems += d.itemsCountSum || 0;
      sumOrders += d.completedOrders || 0;
    });
    return sumOrders > 0 ? Math.round((sumItems / sumOrders) * 10) / 10 : 0;
  }, [data]);

  const highestSingleOrder = useMemo(() => {
    let maxVal = 0;
    data.forEach(d => {
      if ((d.highestSingleOrder || 0) > maxVal) {
        maxVal = d.highestSingleOrder;
      }
    });
    return maxVal;
  }, [data]);

  // Aggregate chart weekday comparison (This Week vs Last Week)
  const comparisonChartData = useMemo(() => {
    const weekdays = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    return weekdays.map(day => {
      const thisDoc = data.find(d => d.dayOfWeek === day);
      const prevDoc = prevWeekData.find(d => d.dayOfWeek === day);
      return {
        weekday: day.toUpperCase(),
        'This Week': thisDoc ? thisDoc.totalRevenue || 0 : 0,
        'Last Week': prevDoc ? prevDoc.totalRevenue || 0 : 0,
      };
    });
  }, [data, prevWeekData]);

  // Aggregate Category Chart (Donut)
  const categoryChartData = useMemo(() => {
    const catsMap: Record<string, number> = {};
    data.forEach(d => {
      const source = catToggle === 'revenue' ? d.categoryRevenue || {} : d.categoryItems || {};
      Object.entries(source).forEach(([cat, val]) => {
        catsMap[cat] = (catsMap[cat] || 0) + val;
      });
    });
    return Object.entries(catsMap).map(([name, value]) => ({
      name: name.replace(/_/g, '.'),
      value
    })).sort((a, b) => b.value - a.value);
  }, [data, catToggle]);

  // Aggregate Top Items
  const topItemsData = useMemo(() => {
    const itemsMap: Record<string, number> = {};
    data.forEach(d => {
      const source = itemToggle === 'count' ? d.topItems || {} : d.topItemsRevenue || {};
      Object.entries(source).forEach(([item, val]) => {
        itemsMap[item] = (itemsMap[item] || 0) + val;
      });
    });
    return Object.entries(itemsMap).map(([name, value]) => ({
      name: name.replace(/_/g, '.'),
      value
    })).sort((a, b) => b.value - a.value).slice(0, 5).reverse();
  }, [data, itemToggle]);

  // Smart Insights Generation (Week-based)
  const insights = useMemo(() => {
    if (isDocEmpty) return [];
    const list: insightsEngine.Insight[] = [];

    // Rule 1: Period comparison this week vs previous week
    if (prevRevenue > 0) {
      const comparison = insightsEngine.getPeriodComparisonInsight(totalRevenue, prevRevenue);
      if (comparison) list.push(comparison);
    }

    // Rule 2: Weekday extremes
    const weekdayAverages: Record<string, number> = {};
    const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    days.forEach(d => {
      const thisDoc = data.find(doc => doc.dayOfWeek === d);
      weekdayAverages[d] = thisDoc ? thisDoc.totalRevenue || 0 : 0;
    });
    const extremes = insightsEngine.getWeekdayExtremesInsight(weekdayAverages);
    if (extremes) list.push(extremes);

    // Rule 3: Weekend concentration
    let weekendRevenue = 0;
    data.forEach(d => {
      if (d.dayOfWeek === 'sat' || d.dayOfWeek === 'sun') {
        weekendRevenue += d.totalRevenue || 0;
      }
    });
    const concentration = insightsEngine.getRevenueConcentrationInsight(totalRevenue, weekendRevenue);
    if (concentration) list.push(concentration);

    // Rule 4: Item economics (aggregate item prices)
    const aggregateTop = {} as Record<string, number>;
    const aggregateTopRev = {} as Record<string, number>;
    data.forEach(d => {
      Object.entries(d.topItems || {}).forEach(([n, q]) => { aggregateTop[n] = (aggregateTop[n] || 0) + q; });
      Object.entries(d.topItemsRevenue || {}).forEach(([n, r]) => { aggregateTopRev[n] = (aggregateTopRev[n] || 0) + r; });
    });
    const itemPrices = Object.keys(aggregateTop).reduce((acc, name) => {
      const qty = aggregateTop[name] || 0;
      const rev = aggregateTopRev[name] || 0;
      acc[name] = qty > 0 ? Math.round(rev / qty) : 0;
      return acc;
    }, {} as Record<string, number>);

    const economics = insightsEngine.getItemEconomicsInsight(aggregateTop, {}, itemPrices);
    if (economics) list.push(economics);

    return list;
  }, [data, prevRevenue, totalRevenue, isDocEmpty]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Weekly Revenue" value={formatCurrency(totalRevenue, currency)} icon={<DollarSign className="text-emerald-400" />} subtitle="completed orders this week" />
        <StatCard
          title="Revenue Change"
          value={(revChangePct >= 0 ? '+' : '') + revChangePct.toFixed(1) + '%'}
          icon={revChangePct >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
          subtitle="vs previous 7 days"
        />
        <StatCard title="Average Order Value" value={formatCurrency(avgOrderValue, currency)} icon={<Activity className="text-purple-400" />} subtitle={`Avg items: ${averageItemsPerOrder} | High: ${formatCurrency(highestSingleOrder || 0, currency)}`} />
        <StatCard title="Best Day" value={bestDayObj.revenue > 0 ? formatCurrency(bestDayObj.revenue, currency) : '--'} icon={<Award className="text-amber-400" />} subtitle={`date: ${bestDayObj.date} | Repeat: ${repeatCustomers}`} />
      </div>

      {isDocEmpty ? (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl"><EmptyState /></div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Weekday Comparison Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-emerald-400" /> Weekday Comparison (WoW)
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="weekday" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="This Week" fill={COLORS.green} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Last Week" fill={COLORS.blue} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Category Donut Chart */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-blue-400" /> Category Breakdown
                </h3>
                <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                  <button onClick={() => setCatToggle('revenue')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${catToggle === 'revenue' ? 'bg-blue-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                  <button onClick={() => setCatToggle('items')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${catToggle === 'items' ? 'bg-blue-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Qty</button>
                </div>
              </div>
              <div className="h-64 flex flex-col justify-center relative">
                {categoryChartData.length === 0 ? (
                  <EmptyState message="No category sales found." />
                ) : (
                  <ResponsiveContainer width="100%" height="90%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryChartData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS.chartColors[index % COLORS.chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => catToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                      <Legend
                        verticalAlign="bottom"
                        height={36}
                        iconType="circle"
                        iconSize={8}
                        formatter={(value) => <span className="text-[#a1a1aa] text-xs font-medium">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Lower Row: Top Items & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Items Horizontal Bar Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-400" /> Top 5 Selling Items
                </h3>
                <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                  <button onClick={() => setItemToggle('count')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${itemToggle === 'count' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Count</button>
                  <button onClick={() => setItemToggle('revenue')} className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${itemToggle === 'revenue' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                </div>
              </div>
              <div className="h-64">
                {topItemsData.length === 0 ? (
                  <EmptyState />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={topItemsData}
                      layout="vertical"
                      margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis type="number" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={10} width={100} tickLine={false} />
                      <Tooltip formatter={(value) => itemToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                      <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Smart Insights Panel */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl flex flex-col">
              <h3 className="font-semibold text-lg border-b border-[#2a2a2a] pb-3 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Smart Insights
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[260px] scrollbar-none pr-1">
                {insights.length === 0 ? (
                  <EmptyState message="No week-level alerts detected." />
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                          insight.tone === 'success' ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.15)] text-[#22c55e]' :
                          insight.tone === 'warning' ? 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.15)] text-[#ef4444]' :
                          insight.tone === 'info' ? 'bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.15)] text-[#3b82f6]' :
                          'bg-[#161616] border-[#2a2a2a] text-[#a1a1aa]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          insight.tone === 'success' ? 'bg-[#22c55e]/15' :
                          insight.tone === 'warning' ? 'bg-[#ef4444]/15' :
                          insight.tone === 'info' ? 'bg-[#3b82f6]/15' :
                          'bg-[#2a2a2a]'
                        }`}>
                          {insight.icon === 'trending-up' && <TrendingUp className="w-4 h-4" />}
                          {insight.icon === 'trending-down' && <TrendingDown className="w-4 h-4" />}
                          {insight.icon === 'calendar' && <Calendar className="w-4 h-4" />}
                          {insight.icon === 'activity' && <Activity className="w-4 h-4" />}
                          {insight.icon === 'dollar-sign' && <DollarSign className="w-4 h-4" />}
                          {insight.icon === 'alert-circle' && <AlertCircle className="w-4 h-4" />}
                          {insight.icon === 'award' && <Award className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold text-sm leading-snug">{insight.title}</h4>
                          <p className="text-[#a1a1aa] text-xs mt-0.5">{insight.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==========================================
// 3. MONTH VIEW LAYOUT
// ==========================================
function MonthViewLayout({
  data,
  prevMonthData,
  currency,
  catToggle,
  setCatToggle,
  itemToggle,
  setItemToggle,
  CustomTooltip,
  EmptyState
}: {
  data: MonthAnalytics | null;
  prevMonthData: MonthAnalytics | null;
  currency: string;
  catToggle: 'revenue' | 'items';
  setCatToggle: (t: 'revenue' | 'items') => void;
  itemToggle: 'count' | 'revenue';
  setItemToggle: (t: 'count' | 'revenue') => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  CustomTooltip: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  EmptyState: any;
}) {
  const isDocEmpty = !data || (data.totalOrders || 0) === 0;

  // Month stats
  const totalRevenue = data?.totalRevenue || 0;
  const totalOrders = data?.totalOrders || 0;
  const avgOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  const bestDay = data?.bestDay || '--';
  const bestDayRevenue = data?.highestRevenueDay || 0;
  const daysElapsed = data?.daysElapsed || 1;

  // pacing percentage projection
  const pacingProjectionPct = useMemo(() => {
    if (!daysElapsed || !prevMonthData || !prevMonthData.totalRevenue) return 0;
    const projected = (totalRevenue / daysElapsed) * 30;
    return ((projected - prevMonthData.totalRevenue) / prevMonthData.totalRevenue) * 100;
  }, [totalRevenue, daysElapsed, prevMonthData]);

  // 1. Daily revenue trend parsing (AreaChart)
  const trendChartData = useMemo(() => {
    if (isDocEmpty) return [];
    const trendMap = data.dailyRevenueTrend || {};
    return Object.entries(trendMap)
      .map(([date, val]) => ({
        day: date.slice(8), // just day number "14", "16"
        date,
        Revenue: val
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data, isDocEmpty]);

  // 2. Weekday averages chart parsing (color-coded bars)
  const weekdayChartData = useMemo(() => {
    if (isDocEmpty) return [];
    const averages = data.weekdayAverages || {};
    
    // Calculate global average to determine green (>20%), orange (<-20%), blue (neutral)
    const vals = Object.values(averages).filter(v => v > 0);
    const globalAvg = vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;

    return ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map(day => {
      const avgVal = averages[day] || 0;
      let fill = COLORS.blue; // neutral
      if (globalAvg > 0 && avgVal > 0) {
        const pctDiff = ((avgVal - globalAvg) / globalAvg) * 100;
        if (pctDiff >= 20) {
          fill = COLORS.green; // above
        } else if (pctDiff <= -20) {
          fill = COLORS.red; // below
        }
      }

      return {
        weekday: day.toUpperCase(),
        Average: avgVal,
        fill
      };
    });
  }, [data, isDocEmpty]);

  // 3. Category donut breakdown
  const categoryChartData = useMemo(() => {
    if (isDocEmpty) return [];
    const sourceMap = catToggle === 'revenue' ? data.categoryRevenue || {} : data.categoryRevenue || {}; // default fallback
    return Object.entries(sourceMap).map(([name, val]) => ({
      name: name.replace(/_/g, '.'),
      value: val
    })).sort((a, b) => b.value - a.value);
  }, [data, catToggle, isDocEmpty]);

  // 4. Top items horizontal bars
  const topItemsData = useMemo(() => {
    if (isDocEmpty) return [];
    const sourceMap = itemToggle === 'count' ? data.topItems || {} : data.topItemsRevenue || {};
    return Object.entries(sourceMap).map(([name, val]) => ({
      name: name.replace(/_/g, '.'),
      value: val
    })).sort((a, b) => b.value - a.value).slice(0, 5).reverse();
  }, [data, itemToggle, isDocEmpty]);

  // Smart Insights Generation
  const insights = useMemo(() => {
    if (isDocEmpty) return [];
    const list: insightsEngine.Insight[] = [];

    // Rule 6: pacingProjection compared to prevMonthData
    if (prevMonthData && prevMonthData.totalRevenue) {
      const pacing = insightsEngine.getPacingProjectionInsight(totalRevenue, daysElapsed, prevMonthData.totalRevenue);
      if (pacing) list.push(pacing);
    }

    // Rule 2: Weekday extremes
    const extremes = insightsEngine.getWeekdayExtremesInsight(data.weekdayAverages || {});
    if (extremes) list.push(extremes);

    // Rule 7: Record breaking best day (using monthly doc highestRevenueDay)
    const todayIST = new Date(Date.now() + (330 * 60000)).toISOString().split('T')[0];
    const todayRevenue = data.dailyRevenueTrend?.[todayIST] || 0;
    const record = insightsEngine.getPeakRecordInsight(todayRevenue, bestDayRevenue, bestDay);
    if (record) list.push(record);

    // Rule 5: Slow moving items
    const slowItems = insightsEngine.getSlowMovingItemsInsight(data.topItems || {});
    if (slowItems) list.push(slowItems);

    return list;
  }, [data, prevMonthData, totalRevenue, daysElapsed, bestDayRevenue, bestDay, isDocEmpty]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="MTD Revenue" value={formatCurrency(totalRevenue, currency)} icon={<DollarSign className="text-emerald-400" />} subtitle={`days elapsed: ${daysElapsed}`} />
        <StatCard
          title="MTD Pacing Projection"
          value={(pacingProjectionPct >= 0 ? '+' : '') + pacingProjectionPct.toFixed(1) + '%'}
          icon={pacingProjectionPct >= 0 ? <TrendingUp className="text-emerald-400" /> : <TrendingDown className="text-rose-400" />}
          subtitle={`projected: ${formatCurrency(Math.round((totalRevenue / daysElapsed) * 30), currency)}`}
        />
        <StatCard title="Completed Orders" value={totalOrders} icon={<ShoppingBag className="text-blue-400" />} subtitle={`AOV: ${formatCurrency(avgOrderValue, currency)} | Repeat: ${data?.repeatCustomers || 0}`} />
        <StatCard title="Best Day" value={bestDay === '--' ? '--' : bestDay.slice(5)} icon={<Award className="text-amber-400" />} subtitle={`Avg items: ${data?.averageItemsPerOrder || 0} | Peak: ${data?.bestHour || data?.peakHour || '--'} | High: ${formatCurrency(data?.highestSingleOrder || 0, currency)}`} />
      </div>

      {isDocEmpty ? (
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 shadow-xl"><EmptyState /></div>
      ) : (
        <>
          {/* Main Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Daily Revenue Trend Area Chart */}
            <div className="lg:col-span-2 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-[#22c55e]" /> Daily Revenue Trend
                </h3>
              </div>
              <div className="h-64">
                {trendChartData.length === 0 ? (
                  <EmptyState message="No trend data recorded." />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="monthGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22c55e" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                      <XAxis dataKey="day" stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="Revenue" stroke="#22c55e" strokeWidth={2} fill="url(#monthGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Weekday Averages Chart (Color-Coded Bars) */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-indigo-400" /> Weekday Averages
                </h3>
              </div>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekdayChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                    <XAxis dataKey="weekday" stroke="#a1a1aa" fontSize={10} tickLine={false} />
                    <YAxis stroke="#a1a1aa" fontSize={11} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="Average" radius={[4, 4, 0, 0]}>
                      {weekdayChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Lower Row: Category / Top Items & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Category Donut & Top Items */}
            <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <PieChartIcon className="w-4 h-4 text-blue-400" /> Categories
                  </h3>
                  <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                    <button onClick={() => setCatToggle('revenue')} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${catToggle === 'revenue' ? 'bg-blue-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                    <button onClick={() => setCatToggle('items')} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${catToggle === 'items' ? 'bg-blue-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Qty</button>
                  </div>
                </div>
                <div className="h-56 flex flex-col justify-center relative">
                  {categoryChartData.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={categoryChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {categoryChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS.chartColors[index % COLORS.chartColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => catToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                        <Legend
                          verticalAlign="bottom"
                          height={28}
                          iconType="circle"
                          iconSize={6}
                          formatter={(value) => <span className="text-[#a1a1aa] text-[10px] font-medium">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Top Items */}
              <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-[#2a2a2a] pb-3">
                  <h3 className="font-semibold text-sm flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-400" /> Top Items
                  </h3>
                  <div className="flex bg-[#1a1a1a] rounded-lg p-0.5 border border-[#2a2a2a]">
                    <button onClick={() => setItemToggle('count')} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${itemToggle === 'count' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Qty</button>
                    <button onClick={() => setItemToggle('revenue')} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${itemToggle === 'revenue' ? 'bg-purple-500 text-white shadow-sm' : 'text-[#a1a1aa]'}`}>Revenue</button>
                  </div>
                </div>
                <div className="h-56">
                  {topItemsData.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={topItemsData}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                        <XAxis type="number" stroke="#a1a1aa" fontSize={9} tickLine={false} />
                        <YAxis dataKey="name" type="category" stroke="#a1a1aa" fontSize={9} width={80} tickLine={false} />
                        <Tooltip formatter={(value) => itemToggle === 'revenue' ? formatCurrency(value as number, currency) : `${value} units`} />
                        <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} barSize={12} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Smart Insights Panel */}
            <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 shadow-xl flex flex-col">
              <h3 className="font-semibold text-lg border-b border-[#2a2a2a] pb-3 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Smart Insights
              </h3>
              <div className="flex-1 space-y-3 overflow-y-auto max-h-[200px] scrollbar-none pr-1">
                {insights.length === 0 ? (
                  <EmptyState message="No monthly insights to display yet." />
                ) : (
                  <div className="space-y-3">
                    {insights.map((insight, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                          insight.tone === 'success' ? 'bg-[rgba(34,197,94,0.06)] border-[rgba(34,197,94,0.15)] text-[#22c55e]' :
                          insight.tone === 'warning' ? 'bg-[rgba(239,68,68,0.06)] border-[rgba(239,68,68,0.15)] text-[#ef4444]' :
                          insight.tone === 'info' ? 'bg-[rgba(59,130,246,0.06)] border-[rgba(59,130,246,0.15)] text-[#3b82f6]' :
                          'bg-[#161616] border-[#2a2a2a] text-[#a1a1aa]'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg shrink-0 ${
                          insight.tone === 'success' ? 'bg-[#22c55e]/15' :
                          insight.tone === 'warning' ? 'bg-[#ef4444]/15' :
                          insight.tone === 'info' ? 'bg-[#3b82f6]/15' :
                          'bg-[#2a2a2a]'
                        }`}>
                          {insight.icon === 'trending-up' && <TrendingUp className="w-4 h-4" />}
                          {insight.icon === 'trending-down' && <TrendingDown className="w-4 h-4" />}
                          {insight.icon === 'calendar' && <Calendar className="w-4 h-4" />}
                          {insight.icon === 'activity' && <Activity className="w-4 h-4" />}
                          {insight.icon === 'dollar-sign' && <DollarSign className="w-4 h-4" />}
                          {insight.icon === 'alert-circle' && <AlertCircle className="w-4 h-4" />}
                          {insight.icon === 'award' && <Award className="w-4 h-4" />}
                        </div>
                        <div>
                          <h4 className="text-white font-semibold text-sm leading-snug">{insight.title}</h4>
                          <p className="text-[#a1a1aa] text-xs mt-0.5">{insight.sub}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Helper Card Component
function StatCard({ title, value, icon, subtitle }: { title: string; value: string | number; icon: React.ReactNode; subtitle?: string }) {
  return (
    <div className="bg-white dark:bg-premium-card border border-slate-200 dark:border-premium-border rounded-2xl p-5 hover:scale-[1.02] hover:shadow-lg dark:hover:shadow-premium transition-all duration-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-slate-500 dark:text-premium-muted text-xs font-semibold uppercase tracking-wider">{title}</span>
        <div className="w-8 h-8 rounded-lg bg-slate-50 dark:bg-premium-bg flex items-center justify-center border border-slate-200 dark:border-premium-border">
          {icon}
        </div>
      </div>
      <p className="text-slate-900 dark:text-premium-text text-2xl font-bold tracking-tight">{value}</p>
      {subtitle && <p className="text-slate-400 dark:text-premium-muted text-[10px] font-medium mt-1 leading-none">{subtitle}</p>}
    </div>
  );
}
