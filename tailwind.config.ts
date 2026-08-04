import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cyber: {
          950: '#05070d',
          900: '#0a0f1a',
          800: '#101828',
          700: '#1b2438',
        },
        neon: {
          green: '#22ff9d',
          red: '#ff4d5e',
          yellow: '#ffd60a',
          cyan: '#38e0ff',
        },
      },
      animation: {
        'scan-line': 'scanline 2.2s linear infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(200%)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
