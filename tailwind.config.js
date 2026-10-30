/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: '#FFF1CC',
        'teal-deep': '#0B4F4A',
        terracotta: '#E07856',
        'brown-dark': '#231A14',
      },
      borderRadius: {
        'card': '16px',
      },
      minHeight: {
        'btn': '56px',
      },
      fontFamily: {
        sans: ['Outfit', 'Noto Sans Devanagari', 'system-ui', '-apple-system', 'sans-serif'],
        devanagari: ['Noto Sans Devanagari', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 8px 24px -4px rgba(35, 26, 20, 0.08), 0 2px 6px -1px rgba(35, 26, 20, 0.04)',
        'elevated': '0 12px 32px -4px rgba(11, 79, 74, 0.15), 0 4px 12px -2px rgba(11, 79, 74, 0.08)',
        'shield': '0 10px 30px rgba(11, 79, 74, 0.25)',
      }
    },
  },
  plugins: [],
}
