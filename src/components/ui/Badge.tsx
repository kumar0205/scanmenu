/* eslint-disable react-refresh/only-export-components */
import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'green' | 'amber' | 'red' | 'blue' | 'gray';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  green: 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]',
  amber: 'bg-[rgba(245,158,11,0.15)] text-[#f59e0b] border border-[rgba(245,158,11,0.3)]',
  red: 'bg-[rgba(239,68,68,0.15)] text-[#ef4444] border border-[rgba(239,68,68,0.3)]',
  blue: 'bg-[rgba(59,130,246,0.15)] text-[#3b82f6] border border-[rgba(59,130,246,0.3)]',
  gray: 'bg-[rgba(82,82,91,0.3)] text-[#a1a1aa] border border-[#2a2a2a]',
};

export function Badge({ variant = 'gray', children, className }: BadgeProps) {
  return (
    <span className={clsx('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  );
}

export function statusBadge(status: string) {
  const map: Record<string, BadgeVariant> = {
    pending: 'amber',
    accepted: 'blue',
    preparing: 'blue',
    ready: 'green',
    completed: 'gray',
    cancelled: 'red',
    available: 'green',
    occupied: 'amber',
    inactive: 'gray',
  };
  return map[status] ?? 'gray';
}
