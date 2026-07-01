import { useState } from 'react';
import { CheckCircle2, Circle, ChevronDown, ChevronUp } from 'lucide-react';
import type { Order } from '../../types';

interface TimelineProps {
  order: Order;
}

export function Timeline({ order }: TimelineProps) {
  const [isOpen, setIsOpen] = useState(false);
  const t = (order.timeline || {}) as any;

  const steps = [
    { key: 'orderedAt', label: 'Ordered', time: t.orderedAt },
    { key: 'acceptedAt', label: 'Accepted', time: t.acceptedAt },
    { key: 'preparingAt', label: 'Preparing', time: t.preparingAt },
    { key: 'readyAt', label: 'Ready', time: t.readyAt },
    { key: 'pickedUpAt', label: 'Picked Up', time: t.pickedUpAt || (order.status === 'out_for_delivery' || order.status === 'delivered' ? order.updatedAt : null) },
    { key: 'deliveredAt', label: 'Delivered', time: t.deliveredAt || (order.status === 'delivered' ? order.updatedAt : null) },
  ];

  function formatTime(timestamp: any) {
    if (!timestamp) return '';
    const date = typeof timestamp.toMillis === 'function' ? new Date(timestamp.toMillis()) : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="bg-premium-card border border-premium-border rounded-[16px] p-5 text-left w-full space-y-4 shadow-premium">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none select-none"
      >
        <h4 className="text-premium-text font-extrabold text-xs uppercase tracking-wider">Delivery Timeline</h4>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-premium-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-premium-muted" />
        )}
      </button>

      {isOpen && (
        <div className="relative pl-6 space-y-5 pt-2 animate-fadeIn select-none">
          {/* Progress line */}
          <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-premium-border/40" />

          {steps.map((step, idx) => {
            const isDone = !!step.time;
            return (
              <div key={idx} className="relative flex justify-between items-center text-xs">
                {/* Dot Icon */}
                <div className="absolute -left-6 top-1/2 -translate-y-1/2 flex items-center justify-center bg-premium-card p-0.5 z-10">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-premium-success" />
                  ) : (
                    <Circle className="w-4 h-4 text-premium-muted" />
                  )}
                </div>

                <div>
                  <p className={`font-bold ${isDone ? 'text-premium-text' : 'text-premium-muted/60'}`}>{step.label}</p>
                </div>

                {isDone && (
                  <span className="text-[10px] text-premium-muted font-mono font-bold">{formatTime(step.time)}</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
