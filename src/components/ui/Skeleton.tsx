import { clsx } from 'clsx';

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle';
}

export function Skeleton({ className, variant = 'rect' }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden bg-[#1a1a1a]',
        variant === 'circle' ? 'rounded-full' : 'rounded-lg',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.5s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        className
      )}
    />
  );
}
