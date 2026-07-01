import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30',
  amber: 'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30',
  red: 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30',
  blue: 'bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30',
  gray: 'bg-slate-100 dark:bg-[#94A3B8]/15 text-slate-600 dark:text-[#94A3B8] border border-slate-200 dark:border-premium-border',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold select-none', variants[variant], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    pending: 'amber',
    accepted: 'blue',
    preparing: 'amber',
    ready: 'green',
    completed: 'green',
    delivered: 'blue',
    cancelled: 'red',
    available: 'green',
    occupied: 'amber',
    inactive: 'gray',
    paid: 'green',
  };
  return map[status] ?? 'gray';
}
