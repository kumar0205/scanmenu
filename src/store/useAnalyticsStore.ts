import { create } from 'zustand';
import type { DayAnalytics, MonthAnalytics } from '../types';
import { fetchDayAnalytics, fetchWeekAnalytics, fetchMonthAnalytics } from '../firebase/analyticsDb';

interface AnalyticsState {
  dayData: Record<string, DayAnalytics | null>; // keyed by date (YYYY-MM-DD)
  weekData: Record<string, DayAnalytics[] | null>; // keyed by date list (e.g. YYYY-MM-DD_7)
  monthData: Record<string, MonthAnalytics | null>; // keyed by month (YYYY-MM)
  loading: Record<'day' | 'week' | 'month', boolean>;
  
  getDayData: (restaurantId: string, dateStr: string) => Promise<DayAnalytics | null>;
  getWeekData: (restaurantId: string, dates: string[]) => Promise<DayAnalytics[]>;
  getMonthData: (restaurantId: string, monthStr: string) => Promise<MonthAnalytics | null>;
  
  clearCache: () => void;
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  dayData: {},
  weekData: {},
  monthData: {},
  loading: {
    day: false,
    week: false,
    month: false,
  },

  getDayData: async (restaurantId, dateStr) => {
    const cached = get().dayData[dateStr];
    if (cached !== undefined) {
      return cached;
    }
    
    set(state => ({ loading: { ...state.loading, day: true } }));
    try {
      const data = await fetchDayAnalytics(restaurantId, dateStr);
      set(state => ({
        dayData: { ...state.dayData, [dateStr]: data },
        loading: { ...state.loading, day: false }
      }));
      return data;
    } catch (err) {
      console.error('fetchDayAnalytics failed:', err);
      set(state => ({ loading: { ...state.loading, day: false } }));
      return null;
    }
  },

  getWeekData: async (restaurantId, dates) => {
    const cacheKey = dates.join('_');
    const cached = get().weekData[cacheKey];
    if (cached !== undefined && cached !== null) {
      return cached;
    }

    set(state => ({ loading: { ...state.loading, week: true } }));
    try {
      const data = await fetchWeekAnalytics(restaurantId, dates);
      set(state => ({
        weekData: { ...state.weekData, [cacheKey]: data },
        loading: { ...state.loading, week: false }
      }));
      return data;
    } catch (err) {
      console.error('fetchWeekAnalytics failed:', err);
      set(state => ({ loading: { ...state.loading, week: false } }));
      return [];
    }
  },

  getMonthData: async (restaurantId, monthStr) => {
    const cached = get().monthData[monthStr];
    if (cached !== undefined) {
      return cached;
    }

    set(state => ({ loading: { ...state.loading, month: true } }));
    try {
      const data = await fetchMonthAnalytics(restaurantId, monthStr);
      set(state => ({
        monthData: { ...state.monthData, [monthStr]: data },
        loading: { ...state.loading, month: false }
      }));
      return data;
    } catch (err) {
      console.error('fetchMonthAnalytics failed:', err);
      set(state => ({ loading: { ...state.loading, month: false } }));
      return null;
    }
  },

  clearCache: () => set({ dayData: {}, weekData: {}, monthData: {} }),
}));
