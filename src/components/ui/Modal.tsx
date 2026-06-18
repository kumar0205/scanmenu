import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Modal({ open, onClose, title, children, className, bodyClassName }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative z-10 bg-[#111111] border border-[#2a2a2a] rounded-xl shadow-2xl w-full max-w-lg',
          'animate-in slide-in-from-bottom-4 duration-200',
          className
        )}
      >
        <div className="flex items-center justify-between p-5 border-b border-[#2a2a2a]">
          {title && <h3 className="text-white font-semibold text-base">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto text-[#52525b] hover:text-white transition-colors p-1 rounded-md hover:bg-[#1a1a1a]"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className={bodyClassName || 'p-5'}>{children}</div>
      </div>
    </div>
  );
}
