/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#050505',
          secondary: '#0a0a0a',
          tertiary: '#111111',
        },
        accent: {
          purple: '#a855f7',
          pink: '#ec4899',
          gold: '#fbbf24',
          green: '#34d399',
          red: '#f87171',
        },
      },
      fontFamily: {
        playfair: ['Playfair Display', 'serif'],
        inter: ['Inter', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 20px rgba(168, 85, 247, 0.4), 0 0 60px rgba(168, 85, 247, 0.15)',
        'glow-pink': '0 0 20px rgba(236, 72, 153, 0.4), 0 0 60px rgba(236, 72, 153, 0.15)',
        'glow-gold': '0 0 20px rgba(251, 191, 36, 0.3), 0 0 60px rgba(251, 191, 36, 0.15)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite ease-in-out',
        'spin-slow': 'spin-slow 3s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(168, 85, 247, 0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(168, 85, 247, 0.6)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-12px)' },
        },
      },
    },
  },
  plugins: [],
};
