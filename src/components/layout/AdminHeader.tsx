import { useI18n } from '../../context/I18nContext';

interface AdminHeaderProps {
  title: string;
}

export function AdminHeader({ title }: AdminHeaderProps) {
  const { language, setLanguage } = useI18n();

  return (
    <header className="h-[60px] border-b border-[#2a2a2a] flex items-center justify-between px-6 bg-[#0a0a0a]">
      <h1 className="text-white font-semibold text-xl">{title}</h1>
      
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as any)}
        className="bg-[#111111] border border-[#2a2a2a] text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-[#22c55e]"
      >
        <option value="en">English</option>
        <option value="te">తెలుగు</option>
        <option value="hi">हिंदी</option>
      </select>
    </header>
  );
}
