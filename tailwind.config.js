/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        crafted: {
          bg: '#151212',
          'bg-deep': '#0E0C0C',
          surface: '#1E1818',
          'surface-hover': '#292020',
          panel: '#1A1414',
          'panel-glass': 'rgba(30, 24, 24, 0.85)',
          border: '#352929',
          'border-bright': '#4A3A3A',
          'border-glow': 'rgba(107, 100, 246, 0.4)',
          text: '#F3EFEF',
          'text-muted': '#A19898',
          'text-dim': '#756C6C',
          brand: {
            rust: '#D45B3E',
            rustDark: '#A9452D',
            violet: '#6B64F6',
            violetDark: '#4641A1',
            cyan: '#38BDF8',
            amber: '#F59E0B',
            emerald: '#10B981',
          },
        },
      },
      backgroundImage: {
        'crafted-brand': 'linear-gradient(135deg, #6B64F6 0%, #A9452D 50%, #D45B3E 100%)',
        'crafted-button': 'linear-gradient(90deg, #6B64F6 0%, #D45B3E 50%, #F59E0B 100%)',
        'crafted-rust-gradient': 'linear-gradient(135deg, #A9452D 0%, #D45B3E 100%)',
        'crafted-glow-violet': 'radial-gradient(circle at 10% 20%, rgba(70, 65, 161, 0.25) 0%, transparent 60%)',
        'crafted-glow-rust': 'radial-gradient(circle at 90% 80%, rgba(169, 69, 45, 0.22) 0%, transparent 60%)',
        'wheel-metal': 'conic-gradient(from 180deg at 50% 50%, #201A1A 0deg, #2D2424 90deg, #201A1A 180deg, #2D2424 270deg, #201A1A 360deg)',
      },
      fontFamily: {
        sans: [
          'Inter',
          'Geist',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
        mono: ['JetBrains Mono', 'Geist Mono', 'Menlo', 'Consolas', 'monospace'],
      },
      borderRadius: {
        sm: '10px',
        md: '14px',
        lg: '18px',
        xl: '26px',
        '2xl': '32px',
        '3xl': '40px',
      },
      boxShadow: {
        'crafted-card': '0 8px 32px rgba(0, 0, 0, 0.45)',
        'crafted-glow': '0 0 25px rgba(212, 91, 62, 0.25)',
        'crafted-glow-violet': '0 0 25px rgba(107, 100, 246, 0.25)',
        'wheel-outer': '0 16px 40px rgba(0, 0, 0, 0.7), inset 0 2px 4px rgba(255, 255, 255, 0.08), inset 0 -4px 10px rgba(0, 0, 0, 0.6)',
        'stick-base': 'inset 0 4px 8px rgba(0,0,0,0.8), 0 2px 6px rgba(255,255,255,0.06)',
        'stick-cap': '0 8px 20px rgba(0,0,0,0.7), inset 0 2px 3px rgba(255,255,255,0.15)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
    },
  },
  plugins: [],
};
