/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#6C4EE0',
        'brand-dark': '#5A3FC0',
        ink: '#1E1240',
        muted: '#7A7391',
        card: '#F6F3FE',
        stroke: '#E7E3F5',
        canvas: '#FBFAFE',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
      // 홈 화면 모션용 애니메이션
      keyframes: {
        rise: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'none' },
        },
        float: {
          '0%, 100%': { transform: 'translate(0, 0) scale(1)' },
          '50%': { transform: 'translate(40px, -30px) scale(1.12)' },
        },
        'dot-bounce': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.4' },
          '50%': { transform: 'translateY(-5px)', opacity: '1' },
        },
        blink: {
          '50%': { opacity: '0' },
        },
        'pulse-dot': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(61,190,139,0.5)' },
          '50%': { boxShadow: '0 0 0 7px rgba(61,190,139,0)' },
        },
        burst: {
          from: { transform: 'scale(0.9)', opacity: '0.6' },
          to: { transform: 'scale(1.25)', opacity: '0' },
        },
        shine: {
          from: { transform: 'translateX(-100%)' },
          to: { transform: 'translateX(100%)' },
        },
        'grad-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
      },
      animation: {
        rise: 'rise 0.8s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'rise-fast': 'rise 0.45s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        float: 'float 14s ease-in-out infinite',
        'dot-bounce': 'dot-bounce 1s infinite',
        blink: 'blink 0.8s infinite',
        'pulse-dot': 'pulse-dot 1.6s infinite',
        'grad-shift': 'grad-shift 8s ease infinite',
        burst: 'burst 1.1s ease-out forwards',
        shine: 'shine 1s ease forwards',
      },
    },
  },
  plugins: [],
};
