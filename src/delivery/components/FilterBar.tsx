import { Search, SlidersHorizontal, MapPin } from 'lucide-react';

export type SortType = 'nearest' | 'oldest_ready' | 'highest_value' | 'newest';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedTown: string;
  onTownChange: (val: string) => void;
  towns: string[];
  sortBy: SortType;
  onSortChange: (val: SortType) => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  selectedTown,
  onTownChange,
  towns,
  sortBy,
  onSortChange
}: FilterBarProps) {
  return (
    <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4.5 space-y-3.5 w-full text-left">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525b]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by restaurant name or ID..."
          className="w-full pl-10 pr-4 py-2.5 bg-[#181818] border border-[#2a2a2a] text-white placeholder-[#52525b] text-sm rounded-xl focus:outline-none focus:border-[#22c55e] transition-colors"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Town Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider flex items-center gap-1">
            <MapPin className="w-3 h-3 text-[#22c55e]" /> Town Selection
          </label>
          <select
            value={selectedTown}
            onChange={(e) => onTownChange(e.target.value)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] text-white text-xs font-semibold rounded-xl focus:outline-none focus:border-[#22c55e] cursor-pointer transition-colors"
          >
            <option value="">All Towns</option>
            {towns.map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Sort Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider flex items-center gap-1">
            <SlidersHorizontal className="w-3 h-3 text-[#22c55e]" /> Sort By
          </label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortType)}
            className="w-full px-3 py-2 bg-[#181818] border border-[#2a2a2a] text-white text-xs font-semibold rounded-xl focus:outline-none focus:border-[#22c55e] cursor-pointer transition-colors"
          >
            <option value="newest">Newest Orders</option>
            <option value="oldest_ready">Oldest Ready</option>
            <option value="highest_value">Highest Value</option>
            <option value="nearest">Nearest Location</option>
          </select>
        </div>
      </div>
    </div>
  );
}
