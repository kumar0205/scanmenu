import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

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
    <motion.button
      whileHover={{ scale: disabled || loading ? 1 : 1.015 }}
      whileTap={{ scale: disabled || loading ? 1 : 0.985 }}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-[#0B0F19] disabled:opacity-50 disabled:cursor-not-allowed select-none',
        {
          'bg-premium-primary hover:bg-blue-650 text-white focus:ring-premium-primary/50 shadow-sm hover:shadow-md active:shadow-sm transition-all duration-150': variant === 'primary',
          'border border-slate-300 dark:border-premium-border hover:bg-slate-50 dark:hover:bg-premium-hover text-slate-800 dark:text-premium-text bg-white dark:bg-premium-card focus:ring-premium-primary/50 shadow-sm hover:shadow active:shadow-inner transition-all duration-150': variant === 'outline',
          'bg-transparent hover:bg-slate-100 dark:hover:bg-premium-hover text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text focus:ring-premium-border/50 transition-all duration-150': variant === 'ghost',
          'bg-premium-danger hover:bg-red-600 text-white focus:ring-premium-danger/50 shadow-sm hover:shadow-md transition-all duration-150': variant === 'danger',
          'text-xs h-9 px-3': size === 'sm',
          'text-sm h-[42px] px-4': size === 'md',
          'text-base h-12 px-6': size === 'lg',
          'w-full': fullWidth,
        },
        className
      )}
      disabled={disabled || loading}
      {...(props as any)}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
      {children}
    </motion.button>
  );
}
