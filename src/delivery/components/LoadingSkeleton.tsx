interface LoadingSkeletonProps {
  type?: 'card' | 'details' | 'profile' | 'stat';
  count?: number;
}

export function LoadingSkeleton({ type = 'card', count = 1 }: LoadingSkeletonProps) {
  const elements = Array.from({ length: count });

  if (type === 'stat') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
        {elements.map((_, i) => (
          <div key={i} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4 flex gap-3 items-center animate-pulse">
            <div className="w-10 h-10 rounded-xl bg-[#2a2a2a] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-[#2a2a2a] rounded w-2/3" />
              <div className="h-5 bg-[#2a2a2a] rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'details') {
    return (
      <div className="space-y-4 w-full text-left animate-pulse">
        <div className="h-6 bg-[#2a2a2a] rounded w-1/3" />
        <div className="h-4 bg-[#2a2a2a] rounded w-1/4" />
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 space-y-4">
          <div className="space-y-2">
            <div className="h-4 bg-[#2a2a2a] rounded w-1/2" />
            <div className="h-3 bg-[#2a2a2a] rounded w-3/4" />
          </div>
          <hr className="border-[#2a2a2a]" />
          <div className="space-y-2">
            <div className="h-4 bg-[#2a2a2a] rounded w-1/3" />
            <div className="h-3 bg-[#2a2a2a] rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'profile') {
    return (
      <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-6 space-y-6 w-full animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#2a2a2a]" />
          <div className="flex-1 space-y-2">
            <div className="h-5 bg-[#2a2a2a] rounded w-1/3" />
            <div className="h-3 bg-[#2a2a2a] rounded w-1/2" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-8 bg-[#2a2a2a] rounded" />
          <div className="h-8 bg-[#2a2a2a] rounded" />
          <div className="h-8 bg-[#2a2a2a] rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 w-full">
      {elements.map((_, i) => (
        <div key={i} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5 space-y-4 animate-pulse text-left">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-3 bg-[#2a2a2a] rounded w-1/4" />
              <div className="h-5 bg-[#2a2a2a] rounded w-1/2" />
            </div>
            <div className="w-16 h-6 bg-[#2a2a2a] rounded-full" />
          </div>
          <div className="h-12 bg-[#181818] border border-[#2a2a2a] rounded-xl" />
          <div className="flex justify-between items-center">
            <div className="h-4 bg-[#2a2a2a] rounded w-1/4" />
            <div className="w-24 h-10 bg-[#2a2a2a] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
