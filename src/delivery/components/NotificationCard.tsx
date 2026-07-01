import { Bell, Check, Clock } from 'lucide-react';
import type { InAppNotification } from '../types';
import { formatTimeAgo } from '../../utils/formatters';

interface NotificationCardProps {
  notification: InAppNotification;
  onRead: (id: string) => void;
}

export function NotificationCard({ notification, onRead }: NotificationCardProps) {
  return (
    <div className={`p-4 rounded-[16px] border transition-all duration-300 flex gap-3 text-left shadow-premium ${
      notification.read 
        ? 'bg-premium-card/60 border-premium-border opacity-70' 
        : 'bg-premium-card border-premium-primary/20 shadow-[0_0_15px_rgba(59,130,246,0.03)]'
    }`}>
      <div className={`p-2.5 rounded-xl shrink-0 ${
        notification.type === 'new_order' ? 'bg-premium-success/10 text-premium-success' :
        notification.type === 'order_cancelled' ? 'bg-premium-danger/10 text-premium-danger' :
        notification.type === 'assigned' ? 'bg-premium-primary/10 text-premium-primary' :
        'bg-purple-500/10 text-purple-400'
      }`}>
        <Bell className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <h4 className="text-premium-text font-extrabold text-sm leading-tight truncate">{notification.title}</h4>
          <span className="text-[10px] text-premium-muted font-mono whitespace-nowrap shrink-0 flex items-center gap-1 font-bold">
            <Clock className="w-3 h-3 text-premium-primary" />
            {formatTimeAgo(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-premium-muted mt-1 leading-relaxed font-semibold">{notification.body}</p>

        {!notification.read && (
          <button
            onClick={() => onRead(notification.id)}
            className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-premium-success hover:text-green-400 transition-colors"
          >
            <Check className="w-3.5 h-3.5" /> Mark read
          </button>
        )}
      </div>
    </div>
  );
}
