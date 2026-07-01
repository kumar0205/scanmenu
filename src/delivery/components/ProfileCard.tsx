import type { DeliveryBoy } from '../types';
import { User, Bike, FileText, MapPin, CreditCard } from 'lucide-react';

interface ProfileCardProps {
  profile: DeliveryBoy;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 text-left space-y-4 w-full">
      <div className="flex items-center gap-4">
        {profile.profileImage ? (
          <img 
            src={profile.profileImage} 
            alt={profile.name} 
            className="w-16 h-16 rounded-full object-cover border border-[#2a2a2a]"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-[#181818] border border-[#2a2a2a] flex items-center justify-center text-[#71717a]">
            <User className="w-8 h-8" />
          </div>
        )}
        <div>
          <h3 className="text-white font-extrabold text-base leading-tight">{profile.name}</h3>
          <p className="text-xs text-[#71717a] mt-0.5 font-mono">ID: {profile.uid.slice(0, 8)}</p>
          <div className="flex items-center gap-1 text-[10px] font-bold text-[#22c55e] uppercase tracking-wider mt-1.5">
            <span className={`w-2 h-2 rounded-full ${profile.isOnline ? 'bg-[#22c55e]' : 'bg-[#71717a]'}`} />
            {profile.isOnline ? 'Online & Available' : 'Offline'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-[#2a2a2a]">
        <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl space-y-1">
          <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <Bike className="w-3.5 h-3.5 text-[#22c55e]" /> Vehicle
          </span>
          <p className="text-xs text-white font-extrabold">{profile.vehicle || 'Not specified'}</p>
        </div>
        <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl space-y-1">
          <span className="text-[10px] text-[#71717a] uppercase font-bold tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#22c55e]" /> License Plate
          </span>
          <p className="text-xs text-white font-extrabold font-mono">{profile.vehicleNumber || 'N/A'}</p>
        </div>
      </div>

      {profile.currentTown && (
        <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl flex items-center gap-2">
          <MapPin className="w-4 h-4 text-[#22c55e]" />
          <div>
            <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-wider block">Assigned Town</span>
            <span className="text-xs text-white font-bold">{profile.currentTown}</span>
          </div>
        </div>
      )}

      {profile.upiId && (
        <div className="bg-[#181818] border border-[#2a2a2a] p-3 rounded-xl flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-[#22c55e]" />
          <div>
            <span className="text-[9px] text-[#71717a] uppercase font-bold tracking-wider block">UPI ID (Collections)</span>
            <span className="text-xs text-white font-bold font-mono">{profile.upiId}</span>
          </div>
        </div>
      )}
    </div>
  );
}
