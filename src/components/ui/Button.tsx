import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0a0a0a] disabled:opacity-50 disabled:cursor-not-allowed',
        {
          'bg-[#22c55e] hover:bg-[#16a34a] text-white focus:ring-[#22c55e]': variant === 'primary',
          'border border-[#2a2a2a] hover:border-[#22c55e] hover:text-[#22c55e] text-[#a1a1aa] bg-transparent focus:ring-[#22c55e]': variant === 'outline',
          'bg-transparent hover:bg-[#1a1a1a] text-[#a1a1aa] hover:text-white focus:ring-[#2a2a2a]': variant === 'ghost',
          'bg-[#ef4444] hover:bg-[#dc2626] text-white focus:ring-[#ef4444]': variant === 'danger',
          'text-xs px-3 py-1.5': size === 'sm',
          'text-sm px-4 py-2': size === 'md',
          'text-base px-6 py-3': size === 'lg',
          'w-full': fullWidth,
        },
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}
