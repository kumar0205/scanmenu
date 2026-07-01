import type { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  className?: string;
  color?: 'green' | 'amber' | 'blue' | 'pink' | 'purple' | 'gray';
}

export function StatCard({ title, value, icon, description, className = '', color = 'gray' }: StatCardProps) {
  const colorConfigs = {
    green: {
      border: 'border-[#22c55e]/20',
      iconBg: 'bg-[#22c55e]/15 text-[#22c55e]',
      glow: 'shadow-[0_0_25px_rgba(34,197,94,0.05)]'
    },
    amber: {
      border: 'border-amber-500/20',
      iconBg: 'bg-amber-500/15 text-amber-500',
      glow: 'shadow-[0_0_25px_rgba(245,158,11,0.05)]'
    },
    blue: {
      border: 'border-blue-500/20',
      iconBg: 'bg-blue-500/15 text-blue-500',
      glow: 'shadow-[0_0_25px_rgba(59,130,246,0.05)]'
    },
    pink: {
      border: 'border-pink-500/20',
      iconBg: 'bg-pink-500/15 text-pink-500',
      glow: 'shadow-[0_0_25px_rgba(236,72,153,0.05)]'
    },
    purple: {
      border: 'border-purple-500/20',
      iconBg: 'bg-purple-500/15 text-purple-500',
      glow: 'shadow-[0_0_25px_rgba(168,85,247,0.05)]'
    },
    gray: {
      border: 'border-premium-border',
      iconBg: 'bg-premium-bg text-premium-muted',
      glow: ''
    }
  };

  const style = colorConfigs[color];

  return (
    <div className={`bg-premium-card border ${style.border} rounded-[16px] p-4.5 flex items-start gap-3.5 transition-all duration-300 hover:scale-[1.01] ${style.glow} ${className} shadow-premium`}>
      <div className={`p-3 rounded-xl shrink-0 ${style.iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[10px] font-bold text-premium-muted uppercase tracking-wider truncate">{title}</p>
        <h3 className="text-xl font-extrabold text-premium-text mt-1.5 select-none leading-none tracking-tight">{value}</h3>
        {description && (
          <p className="text-[10px] text-premium-muted/80 mt-1.5 font-semibold truncate">{description}</p>
        )}
      </div>
    </div>
  );
}
