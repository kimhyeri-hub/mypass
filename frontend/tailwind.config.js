/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#6C4EE0',
        'brand-dark': '#5A3FC0',
        ink: '#1E1240',
        muted: '#6B6485',
        card: '#F6F3FE',
        stroke: '#D8D3EC',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Pretendard', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
