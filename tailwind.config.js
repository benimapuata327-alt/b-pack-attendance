/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF3E6',
          100: '#FFE2C2',
          200: '#FFC98C',
          300: '#FFB05C',
          400: '#FB9A3C',
          500: '#F28C28', // Primary orange
          600: '#D9751B',
          700: '#B05A14',
          800: '#7A3E0E',
          900: '#4D2808',
        },
        graphite: {
          50: '#F4F5F6', // Light grey workspace
          100: '#E9ECEE',
          200: '#D2D5D9',
          300: '#AEB3B9',
          400: '#6B7178',
          500: '#4A5058',
          600: '#343A40', // Dark grey
          700: '#2B3036',
          800: '#202428',
          900: '#15181B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Sora', 'Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgba(52,58,64,0.06), 0 1px 3px 0 rgba(52,58,64,0.08)',
        'card-hover': '0 4px 12px 0 rgba(52,58,64,0.10), 0 2px 6px 0 rgba(52,58,64,0.06)',
        brand: '0 4px 14px 0 rgba(242,140,40,0.35)',
      },
      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'slide-up': { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        'slide-in-right': { from: { opacity: 0, transform: 'translateX(16px)' }, to: { opacity: 1, transform: 'translateX(0)' } },
        'scale-in': { from: { opacity: 0, transform: 'scale(0.96)' }, to: { opacity: 1, transform: 'scale(1)' } },
        'pulse-ring': { '0%': { transform: 'scale(0.8)', opacity: 0.6 }, '100%': { transform: 'scale(2.2)', opacity: 0 } },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out',
        'slide-up': 'slide-up 0.25s ease-out',
        'slide-in-right': 'slide-in-right 0.25s ease-out',
        'scale-in': 'scale-in 0.18s ease-out',
        'pulse-ring': 'pulse-ring 1.6s ease-out infinite',
      },
    },
  },
  plugins: [],
};
