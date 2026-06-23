/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // E-Group ICT Software Zrt. official brand color (wine / burgundy)
        egroup: {
          DEFAULT: '#79233a',
          50: '#fbf3f5',
          100: '#f7e6ea',
          200: '#edc3cd',
          300: '#e09aab',
          400: '#cb5f7c',
          500: '#a83a59',
          600: '#79233a',
          700: '#651d31',
          800: '#4f1726',
          900: '#3a111c',
        },
        // Foosball pitch greens
        pitch: {
          light: '#2e9e54',
          DEFAULT: '#1f8a45',
          dark: '#136634',
          line: 'rgba(255,255,255,0.55)',
        },
        // Accent gold (the ball / winner glow)
        gold: {
          DEFAULT: '#f4b730',
          dark: '#d99a16',
        },
      },
      fontFamily: {
        display: ['"Russo One"', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.08), 0 8px 24px -12px rgba(0,0,0,0.18)',
        glow: '0 0 0 3px rgba(244,183,48,0.35)',
      },
      keyframes: {
        'pop-in': {
          '0%': { transform: 'scale(0.92)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'spin-ball': { to: { transform: 'rotate(360deg)' } },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'pop-in': 'pop-in 0.25s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'spin-ball': 'spin-ball 1.2s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
