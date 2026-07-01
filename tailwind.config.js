/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  safelist: [
    'bg-amber-500', 'bg-blue-500', 'bg-green-500', 'bg-red-500', 'bg-gray-500',
    'text-amber-400', 'text-blue-400', 'text-green-400', 'text-red-400', 'text-gray-400',
    'border-amber-500', 'border-blue-500', 'border-green-500', 'border-red-500',
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          50:  '#FDF0E3',
          100: '#FAD9B3',
          500: '#C8651A',   // primary accent
          600: '#A04E10',   // hover
          900: '#1A1814',   // near-black
        },
        'warm': {
          50:  '#FAFAF8',   // page bg
          100: '#F5F3EE',   // card bg alt
          200: '#ECEAE4',   // borders
          600: '#6B6560',   // secondary text
          800: '#2E2B27',   // primary text
          900: '#1A1814',   // headings
        },
        // Premium Dark mode SaaS palette
        'premium-bg': '#0B0F19',
        'premium-sidebar': '#111827',
        'premium-card': '#1E293B',
        'premium-hover': '#273449',
        'premium-border': '#334155',
        'premium-primary': '#3B82F6',
        'premium-success': '#22C55E',
        'premium-warning': '#F59E0B',
        'premium-danger': '#EF4444',
        'premium-muted': '#94A3B8',
        'premium-text': '#F8FAFC',
      },
      fontFamily: {
        'display': ['"Playfair Display"', 'Georgia', 'serif'],
        'ui':      ['"Inter"', '"DM Sans"', 'system-ui', 'sans-serif'],
        'sans':    ['"Inter"', '"DM Sans"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card':   '16px',
        'button': '12px',
        'pill':   '999px',
      },
      boxShadow: {
        'card':  '0 2px 12px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)',
        'float': '0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
        'premium': '0 4px 20px -2px rgba(0, 0, 0, 0.3), 0 2px 8px -1px rgba(0, 0, 0, 0.2)',
      },
      keyframes: {
        popIn: {
          'from': { opacity: '0', transform: 'scale(0.85)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(20px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        cartSlideUp: {
          'from': { transform: 'translateY(100%)' },
          'to': { transform: 'translateY(0)' },
        },
        pricePop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.12)' },
          '100%': { transform: 'scale(1)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        shimmer: {
          'from': { backgroundPosition: '200% 0' },
          'to': { backgroundPosition: '-200% 0' },
        }
      },
      animation: {
        'pop-in':      'popIn 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'slide-up':    'slideUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'cart-in':     'cartSlideUp 400ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'price-pop':   'pricePop 200ms ease-out',
        'pulse-dot':   'pulseDot 1.5s ease-in-out infinite',
        'shimmer':     'shimmer 1.4s infinite',
      }
    },
  },
  plugins: [],
};
