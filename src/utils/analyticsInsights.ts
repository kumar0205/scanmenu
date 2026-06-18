export interface Insight {
  icon: string;
  title: string;
  sub: string;
  tone: 'success' | 'warning' | 'neutral' | 'info';
}

/**
 * 1. Period Comparison Rule
 * Shows an insight if the change in revenue vs the previous period is > 5%.
 */
export function getPeriodComparisonInsight(currentRevenue: number, previousRevenue: number): Insight | null {
  if (!previousRevenue || previousRevenue <= 0) return null;
  const change = ((currentRevenue - previousRevenue) / previousRevenue) * 100;

  if (Math.abs(change) < 5) return null;

  return {
    icon: change > 0 ? 'trending-up' : 'trending-down',
    tone: change > 0 ? 'success' : 'warning',
    title: `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change).toFixed(1)}% vs last period`,
    sub: `Total: ₹${currentRevenue.toLocaleString('en-IN')} vs ₹${previousRevenue.toLocaleString('en-IN')}`
  };
}

/**
 * 2. Weekday Extremes Rule (Week and Month only)
 * Shows highest and lowest weekday if difference is > 30%.
 */
export function getWeekdayExtremesInsight(
  weekdayAverages: Record<string, number>
): Insight | null {
  if (!weekdayAverages || Object.keys(weekdayAverages).length === 0) return null;

  const validDays = Object.entries(weekdayAverages).filter(([, val]) => val > 0);
  if (validDays.length < 2) return null;

  let maxDay = validDays[0][0];
  let maxVal = validDays[0][1];
  let minDay = validDays[0][0];
  let minVal = validDays[0][1];

  validDays.forEach(([day, val]) => {
    if (val > maxVal) {
      maxVal = val;
      maxDay = day;
    }
    if (val < minVal) {
      minVal = val;
      minDay = day;
    }
  });

  if (minVal <= 0) return null;
  const diffPercent = ((maxVal - minVal) / minVal) * 100;

  if (diffPercent < 30) return null;

  const formatDay = (d: string) => d.toUpperCase();

  return {
    icon: 'activity',
    tone: 'neutral',
    title: 'Significant Weekday Sales Variance',
    sub: `${formatDay(maxDay)} is highest (₹${maxVal.toLocaleString('en-IN')}) and ${formatDay(minDay)} is lowest (₹${minVal.toLocaleString('en-IN')})`
  };
}

/**
 * 3. Revenue Concentration Rule
 * Shows if weekend revenue share > 40% of total revenue.
 */
export function getRevenueConcentrationInsight(
  totalRevenue: number,
  weekendRevenue: number
): Insight | null {
  if (!totalRevenue || totalRevenue <= 0) return null;
  const weekendShare = (weekendRevenue / totalRevenue) * 100;

  if (weekendShare <= 40) return null;

  return {
    icon: 'calendar',
    tone: 'info',
    title: 'Strong Weekend Demand',
    sub: `Weekend sales account for ${weekendShare.toFixed(1)}% of this period's revenue`
  };
}

/**
 * 4. Item Economics Rule
 * Detects items that rank high by revenue but lower by units (expensive signature items),
 * or high by units but lower by revenue (volume drivers).
 */
export function getItemEconomicsInsight(
  topItems: Record<string, number>, // item name -> quantity
  _categoryRevenue?: Record<string, number>, // category-based or we can estimate from item prices if not present
  itemPrices: Record<string, number> = {} // optional price map helper
): Insight | null {
  if (!topItems || Object.keys(topItems).length < 2) return null;

  // Since we don't have prices for all items in the rollup doc, we can construct item economics
  // if itemPrices are provided, otherwise look at topItems keys.
  const itemsList = Object.entries(topItems).map(([name, qty]) => {
    const price = itemPrices[name] || 0;
    return {
      name,
      qty,
      revenue: qty * price
    };
  });

  const validRevenueItems = itemsList.filter(item => item.revenue > 0);
  if (validRevenueItems.length < 2) return null;

  // Sort by Qty
  const sortedByQty = [...validRevenueItems].sort((a, b) => b.qty - a.qty);
  // Sort by Revenue
  const sortedByRev = [...validRevenueItems].sort((a, b) => b.revenue - a.revenue);

  // Find if top revenue driver is NOT the top volume driver
  const topRev = sortedByRev[0];
  const topQty = sortedByQty[0];

  if (topRev.name !== topQty.name && topRev.qty < topQty.qty * 0.7) {
    return {
      icon: 'dollar-sign',
      tone: 'success',
      title: 'High-Value Revenue Driver',
      sub: `"${topRev.name}" is a top revenue generator (₹${topRev.revenue.toLocaleString('en-IN')}) despite lower order volume`
    };
  }

  return null;
}

/**
 * 5. Slow-Moving Items Rule (Month only)
 * Detects items with extremely low sales relative to top sellers.
 */
export function getSlowMovingItemsInsight(
  topItems: Record<string, number>
): Insight | null {
  if (!topItems || Object.keys(topItems).length < 3) return null;

  const sorted = Object.entries(topItems).sort((a, b) => b[1] - a[1]);
  const maxQty = sorted[0][1];
  
  if (maxQty < 10) return null; // Only flag if we have enough volume to judge

  // Find items with sales <= 2 and less than 10% of max sales
  const slowItems = sorted.filter(([, qty]) => qty <= 2 && qty < maxQty * 0.1);

  if (slowItems.length === 0) return null;

  const slowItemName = slowItems[0][0];
  const slowItemQty = slowItems[0][1];

  return {
    icon: 'alert-circle',
    tone: 'warning',
    title: 'Slow-Moving Items Detected',
    sub: `"${slowItemName}" sold only ${slowItemQty} unit${slowItemQty === 1 ? '' : 's'} this month. Consider menu updates.`
  };
}

/**
 * 6. Pacing Projection Rule (Month only)
 * Calculates linear revenue projection for the month and compares to the previous month.
 */
export function getPacingProjectionInsight(
  currentRevenue: number,
  daysElapsed: number,
  previousMonthRevenue: number
): Insight | null {
  if (!daysElapsed || daysElapsed <= 0 || !previousMonthRevenue || previousMonthRevenue <= 0) return null;

  const projectedRevenue = (currentRevenue / daysElapsed) * 30;
  const pacingDiff = ((projectedRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;

  return {
    icon: pacingDiff >= 0 ? 'trending-up' : 'trending-down',
    tone: pacingDiff >= 0 ? 'success' : 'warning',
    title: `MTD Pacing: ${pacingDiff >= 0 ? 'Ahead' : 'Behind'} by ${Math.abs(pacingDiff).toFixed(1)}%`,
    sub: `Projected: ₹${Math.round(projectedRevenue).toLocaleString('en-IN')} vs last month ₹${previousMonthRevenue.toLocaleString('en-IN')}`
  };
}

/**
 * 7. Peak Month / Today's Best Record Rule (replaces record-breaking rule using monthly doc only)
 */
export function getPeakRecordInsight(
  currentDayRevenue: number,
  highestRevenueDay: number,
  bestDay: string
): Insight | null {
  if (!highestRevenueDay || highestRevenueDay <= 0) return null;

  if (currentDayRevenue >= highestRevenueDay) {
    return {
      icon: 'award',
      tone: 'success',
      title: 'New Monthly Record!',
      sub: `Today's revenue of ₹${currentDayRevenue.toLocaleString('en-IN')} is the highest of this month!`
    };
  }

  return {
    icon: 'star',
    tone: 'neutral',
    title: 'Monthly Peak Revenue Day',
    sub: `Best day this month was ${bestDay} with ₹${highestRevenueDay.toLocaleString('en-IN')}`
  };
}
