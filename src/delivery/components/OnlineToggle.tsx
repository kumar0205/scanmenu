import { useState } from 'react';
import { updateRiderOnlineStatus } from '../firebase/riderDb';
import toast from 'react-hot-toast';
import { Loader2, Power } from 'lucide-react';

interface OnlineToggleProps {
  uid: string;
  isOnline: boolean;
}

export function OnlineToggle({ uid, isOnline }: OnlineToggleProps) {
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      await updateRiderOnlineStatus(uid, !isOnline);
      toast.success(isOnline ? 'You are now OFFLINE' : 'You are now ONLINE and ready for deliveries!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to change online status');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`w-full py-4 px-6 rounded-2xl flex items-center justify-between border transition-all duration-300 font-bold ${
        isOnline 
          ? 'bg-[rgba(34,197,94,0.15)] text-[#22c55e] border-[#22c55e]/30 shadow-[0_0_20px_rgba(34,197,94,0.1)]' 
          : 'bg-[#111111] text-[#a1a1aa] border-[#2a2a2a] hover:text-white'
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${isOnline ? 'bg-[#22c55e]/25 text-[#22c55e]' : 'bg-[#2a2a2a] text-[#71717a]'}`}>
          <Power className="w-5 h-5" />
        </div>
        <div className="text-left">
          <p className="text-xs uppercase tracking-wider font-semibold text-[#71717a]">Status</p>
          <p className="text-base font-extrabold">{isOnline ? 'ONLINE' : 'OFFLINE'}</p>
        </div>
      </div>
      
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-[#22c55e]" />
      ) : (
        <div className={`w-11 h-6 rounded-full p-0.5 transition-colors duration-300 cursor-pointer ${
          isOnline ? 'bg-[#22c55e]' : 'bg-[#2a2a2a]'
        }`}>
          <div className={`w-5 h-5 rounded-full bg-[#111111] shadow-md transform transition-transform duration-300 ${
            isOnline ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </div>
      )}
    </button>
  );
}
