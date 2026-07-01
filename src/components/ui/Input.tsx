import { type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from 'clsx';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export function Input({ label, error, prefix, suffix, className, ...props }: InputProps) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && <label className="text-xs font-semibold text-slate-500 dark:text-premium-muted uppercase tracking-wider">{label}</label>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3.5 text-slate-400 dark:text-premium-muted select-none flex items-center justify-center">{prefix}</span>
        )}
        <input
          className={clsx(
            'w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl text-slate-900 dark:text-premium-text placeholder-slate-400 dark:placeholder-premium-muted transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-premium-primary/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-premium-sidebar focus:border-premium-primary',
            error && 'border-premium-danger focus:ring-premium-danger/40',
            prefix ? 'pl-10 pr-4' : 'px-4',
            suffix ? 'pr-10' : '',
            'text-sm h-[44px] font-semibold',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 text-slate-400 dark:text-premium-muted select-none flex items-center justify-center">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-premium-danger font-semibold mt-0.5">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && <label className="text-xs font-semibold text-slate-500 dark:text-premium-muted uppercase tracking-wider">{label}</label>}
      <textarea
        className={clsx(
          'w-full bg-slate-50 dark:bg-premium-bg border border-slate-200 dark:border-premium-border rounded-xl text-slate-900 dark:text-premium-text placeholder-slate-400 dark:placeholder-premium-muted transition-all duration-150 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-premium-primary/40 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-premium-sidebar focus:border-premium-primary',
          error && 'border-premium-danger focus:ring-premium-danger/40',
          'px-4 py-3 text-sm min-h-[100px] font-semibold',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-premium-danger font-semibold mt-0.5">{error}</p>}
    </div>
  );
}
