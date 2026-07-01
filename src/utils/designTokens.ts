export const DESIGN_TOKENS = {
  colors: {
    background: '#0B0F19',
    sidebar: '#111827',
    card: '#1E293B',
    hover: '#273449',
    border: '#334155',
    primary: '#3B82F6',
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    textMuted: '#94A3B8',
    textPrimary: '#F8FAFC',
  },
  typography: {
    fontFamily: "'Inter', system-ui, sans-serif",
    sizes: {
      pageTitle: 'text-[32px] font-bold leading-tight tracking-tight',
      sectionTitle: 'text-[22px] font-semibold leading-snug tracking-tight',
      cardTitle: 'text-[16px] font-semibold leading-normal',
      normalText: 'text-[14px] leading-relaxed',
      smallLabel: 'text-[12px] leading-none',
      largeNumber: 'text-[36px] font-extrabold tracking-tight',
    }
  },
  radius: {
    card: 'rounded-[16px]',
    button: 'rounded-[12px]',
    input: 'rounded-[12px]',
    modal: 'rounded-[20px]',
    badge: 'rounded-full',
  },
  spacing: {
    cardPadding: 'p-6',
    pagePadding: 'p-8',
    gap: 'gap-6',
    buttonHeight: 'h-[42px]',
    inputHeight: 'h-[44px]',
  },
  transitions: {
    default: { duration: 0.2, ease: 'easeInOut' },
    fade: { duration: 0.15, ease: 'easeOut' },
    slideUp: { duration: 0.3, ease: 'easeOut' },
    scale: { duration: 0.18, ease: [0.34, 1.56, 0.64, 1] },
  }
};
