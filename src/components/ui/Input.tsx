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
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#a1a1aa]">{label}</label>}
      <div className="relative flex items-center">
        {prefix && (
          <span className="absolute left-3 text-[#52525b] select-none">{prefix}</span>
        )}
        <input
          className={clsx(
            'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#52525b] transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:border-[#22c55e]',
            error && 'border-[#ef4444] focus:ring-[#ef4444]',
            prefix ? 'pl-9 pr-4 py-2.5 text-sm' : 'px-4 py-2.5 text-sm',
            suffix ? 'pr-9' : '',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 text-[#52525b] select-none">{suffix}</span>
        )}
      </div>
      {error && <p className="text-xs text-[#ef4444]">{error}</p>}
    </div>
  );
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export function Textarea({ label, error, className, ...props }: TextareaProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-[#a1a1aa]">{label}</label>}
      <textarea
        className={clsx(
          'w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg text-white placeholder-[#52525b] transition-all duration-150 resize-none',
          'focus:outline-none focus:ring-2 focus:ring-[#22c55e] focus:ring-offset-2 focus:ring-offset-[#0a0a0a] focus:border-[#22c55e]',
          error && 'border-[#ef4444]',
          'px-4 py-2.5 text-sm',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-[#ef4444]">{error}</p>}
    </div>
  );
}
