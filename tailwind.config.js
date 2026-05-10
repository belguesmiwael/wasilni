/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0A0F1C',
        surface: '#111827',
        'surface-2': '#1A2235',
        teal: '#00C9B1',
        gold: '#D4A853',
        danger: '#EF4444',
      },
      fontFamily: { sora: ['var(--font-sora)', 'sans-serif'] },
    },
  },
  plugins: [],
}
