interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config: Record<string, { label: string; bg: string; text: string; border: string }> = {
    pending: { label: 'Pending', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
    accepted: { label: 'Accepted', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    preparing: { label: 'In Kitchen', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
    ready: { label: 'Ready', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30' },
    out_for_delivery: { label: 'Out For Delivery', bg: 'bg-pink-500/10', text: 'text-pink-450', border: 'border-pink-500/20' },
    delivered: { label: 'Delivered', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    completed: { label: 'Completed', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    cancelled: { label: 'Cancelled', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' }
  };

  const style = config[status] || { label: status, bg: 'bg-gray-500/10', text: 'text-gray-400', border: 'border-gray-500/20' };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}
