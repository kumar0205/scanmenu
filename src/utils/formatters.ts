import { Timestamp } from 'firebase/firestore';

export function formatCurrency(amount: number, currency = '₹'): string {
  return currency + amount.toLocaleString('en-IN');
}

/**
 * Progressive relative time:
 *   0–59s   → "5s"
 *   1–119m  → "3 min"
 *   120m–2h → "1 hr 45 min" / "2 hrs"
 *   >2h     → "1 day", "2 days", …
 */
export function formatTimeAgo(
  timestamp: { toMillis: () => number } | Date | number | null | undefined
): string {
  if (!timestamp) return 'just now';
  let ms: number;
  if (typeof timestamp === 'number') {
    ms = timestamp;
  } else if (timestamp instanceof Date) {
    ms = timestamp.getTime();
  } else if (typeof (timestamp as any).toMillis === 'function') {
    ms = (timestamp as any).toMillis();
  } else {
    return 'just now';
  }
  const diff = Math.max(0, Date.now() - ms);
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 120) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) {
    const remMins = mins % 60;
    if (remMins === 0) return hrs === 1 ? '1 hr' : `${hrs} hrs`;
    return `${hrs} hr ${remMins} min`;
  }
  const days = Math.floor(hrs / 24);
  return days === 1 ? '1 day' : `${days} days`;
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function formatDate(timestamp: Timestamp): string {
  return timestamp.toDate().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}
