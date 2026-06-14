import { ReactNode } from 'react';

interface AdminHeaderProps {
  title: string;
  children?: ReactNode;
}

export function AdminHeader({ title, children }: AdminHeaderProps) {
  return (
    <header className="h-[60px] border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#0a0a0a]">
      <h1 className="text-white font-semibold text-xl">{title}</h1>
      {children}
    </header>
  );
}
