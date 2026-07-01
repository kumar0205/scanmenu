import { type ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { motion, AnimatePresence } from 'framer-motion';

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

  // Determine if caller has provided their own max-w-* class
  const hasMaxWidth = className && /max-w-/.test(className);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-slate-900/60 dark:bg-[#0B0F19]/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={clsx(
              'relative z-10 bg-white dark:bg-premium-sidebar border border-slate-200 dark:border-premium-border rounded-[20px] shadow-premium w-full my-auto overflow-hidden text-left',
              !hasMaxWidth && 'max-w-lg',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-premium-border">
              {title && <h3 className="text-slate-900 dark:text-premium-text font-bold text-base">{title}</h3>}
              <button
                onClick={onClose}
                className="ml-auto text-slate-500 dark:text-premium-muted hover:text-slate-900 dark:hover:text-premium-text transition-colors p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-premium-hover"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className={bodyClassName || 'p-5 text-slate-900 dark:text-premium-text'}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
