import { NotificationCard } from '../components/NotificationCard';
import type { InAppNotification } from '../types';
import { Bell, Trash2 } from 'lucide-react';

interface NotificationsProps {
  notifications: InAppNotification[];
  onRead: (id: string) => void;
  onClearAll: () => void;
}

export default function Notifications({ notifications, onRead, onClearAll }: NotificationsProps) {
  return (
    <div className="space-y-4 text-left">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-extrabold text-white">Notifications</h2>
          <p className="text-xs text-[#71717a] mt-0.5">Real-time delivery updates and alerts.</p>
        </div>
        {notifications.length > 0 && (
          <button
            onClick={onClearAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 hover:bg-red-500/10 text-xs font-bold transition active:scale-95 touch-manipulation"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-20 bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6">
          <Bell className="w-14 h-14 text-[#2a2a2a] mx-auto mb-4" />
          <h4 className="text-white font-extrabold text-sm">All caught up!</h4>
          <p className="text-xs text-[#52525b] mt-1">New updates about assigned delivery orders will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {notifications.map(notif => (
            <NotificationCard
              key={notif.id}
              notification={notif}
              onRead={onRead}
            />
          ))}
        </div>
      )}
    </div>
  );
}
