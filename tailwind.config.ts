import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: {
          dark: '#2c5f2e',
          light: '#316633',
          bg: '#1a3322',
        },
        ui: {
          bg: '#080e0c',
          card: '#0c1710',
          panel: '#0e1a15',
          border: '#1a2d22',
          hover: '#243d2c',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
