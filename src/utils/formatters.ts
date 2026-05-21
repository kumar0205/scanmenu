import { Timestamp } from 'firebase/firestore';

export function formatCurrency(amount: number, currency = '₹'): string {
  return currency + amount.toLocaleString('en-IN');
}

export function formatTimeAgo(timestamp: Timestamp): string {
  const now = Date.now();
  const diff = now - timestamp.toMillis();
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
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
