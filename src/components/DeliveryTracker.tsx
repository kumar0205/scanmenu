import { Clock, MapPin, CheckCircle, Package, Truck, Utensils } from 'lucide-react';
import type { Order } from '../types';

interface DeliveryTrackerProps {
  order: Order;
  currency: string;
}

export function DeliveryTracker({ order, currency: _currency }: DeliveryTrackerProps) {
  const { status, timeline, orderType } = order;

  if (status === 'delivered' || status === 'completed') {
    return null;
  }

  // Set steps based on orderType
  const isDelivery = orderType === 'delivery';
  
  const steps = isDelivery 
    ? [
        { key: 'ordered', label: 'Order Placed', icon: Clock, time: timeline?.orderedAt },
        { key: 'accepted', label: 'Order Accepted', icon: CheckCircle, time: timeline?.acceptedAt },
        { key: 'preparing', label: 'Preparing Food', icon: Utensils, time: timeline?.preparingAt },
        { key: 'ready', label: 'Ready for Dispatch', icon: Package, time: timeline?.readyAt },
        { key: 'pickedUp', label: 'Out for Delivery', icon: Truck, time: timeline?.pickedUpAt },
        { key: 'delivered', label: 'Delivered', icon: MapPin, time: timeline?.deliveredAt }
      ]
    : [
        { key: 'ordered', label: 'Order Placed', icon: Clock, time: timeline?.orderedAt },
        { key: 'accepted', label: 'Order Accepted', icon: CheckCircle, time: timeline?.acceptedAt },
        { key: 'preparing', label: 'Preparing Food', icon: Utensils, time: timeline?.preparingAt },
        { key: 'ready', label: 'Ready', icon: Package, time: timeline?.readyAt },
        { key: 'delivered', label: 'Served', icon: MapPin, time: timeline?.deliveredAt || order.updatedAt } // served
      ];

  // Helper to determine step status
  function getStepStatus(_stepKey: string, stepIndex: number) {
    if (status === 'cancelled') return 'cancelled';

    // Map order.status string to step index
    const statusIndices: Record<string, number> = isDelivery
      ? {
          pending: 0,
          accepted: 1,
          preparing: 2,
          ready: 3,
          out_for_delivery: 4,
          delivered: 5,
          completed: 5 // Fallback
        }
      : {
          pending: 0,
          accepted: 1,
          preparing: 2,
          ready: 3,
          served: 4,
          completed: 4 // served/completed
        };

    const currentActiveIndex = statusIndices[status] ?? 0;

    if (status === 'delivered' || status === 'completed') return 'completed';
    if (stepIndex === currentActiveIndex) return 'current';
    if (stepIndex < currentActiveIndex) return 'completed';
    return 'upcoming';
  }

  // Render localized time helper
  function formatTime(timestamp: any) {
    if (!timestamp) return null;
    const date = typeof timestamp.toMillis === 'function' ? new Date(timestamp.toMillis()) : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 space-y-4 text-left shadow-sm">
      <div className="flex justify-between items-center border-b border-stone-100 pb-3 mb-2">
        <div>
          <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Status Tracker</span>
          <h3 className="font-bold text-stone-900 text-sm mt-0.5">
            Order #{order.dailyOrderId || order.id.slice(0, 8)}
          </h3>
        </div>
        {status === 'cancelled' && (
          <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-700 font-bold text-[10px] uppercase rounded-full">
            Cancelled
          </span>
        )}
      </div>

      <div className="relative pl-7 space-y-6">
        {/* Draw vertical connecting line */}
        <div className="absolute top-1.5 left-[13px] bottom-1.5 w-0.5 bg-stone-100" />
        
        {steps.map((step, idx) => {
          const stepStatus = getStepStatus(step.key, idx);
          const Icon = step.icon;

          return (
            <div key={step.key} className="relative flex justify-between items-start">
              {/* Indicator circle */}
              <div 
                className={`absolute -left-7 w-7 h-7 rounded-full flex items-center justify-center border transition-all z-10 ${
                  stepStatus === 'completed' ? 'bg-amber-500 border-amber-500 text-white' :
                  stepStatus === 'current' ? 'bg-white border-amber-500 text-amber-600 ring-4 ring-amber-50' :
                  stepStatus === 'cancelled' && idx <= 1 ? 'bg-red-500 border-red-500 text-white' :
                  'bg-white border-stone-200 text-stone-400'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>

              <div className="pl-3 flex-1">
                <p className={`text-xs font-bold transition-colors ${
                  stepStatus === 'completed' ? 'text-stone-900' :
                  stepStatus === 'current' ? 'text-amber-600' :
                  'text-stone-400'
                }`}>
                  {step.label}
                </p>
                {stepStatus === 'current' && (
                  <p className="text-[10px] text-stone-500 mt-0.5 leading-relaxed">
                    {isDelivery && step.key === 'pickedUp' ? 'Your rider is on the way!' : 'We are processing your request.'}
                  </p>
                )}
              </div>

              {/* Time display */}
              <span className="text-[10px] font-bold font-mono text-stone-400">
                {step.time ? formatTime(step.time) : (stepStatus === 'completed' ? 'Done' : '--:--')}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
