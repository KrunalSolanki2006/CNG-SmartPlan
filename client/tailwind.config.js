/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          sidebar: '#142B3A',
          hover: '#1B384B',
          dark: '#0D1C26',
        },
        primary: {
          teal: '#0F766E',
          tealDark: '#0D645D',
          tealLight: '#14B8A6',
          softTeal: '#DDF3EF',
        },
        canvas: {
          bg: '#F5F7FA',
          surface: '#FFFFFF',
          subtle: '#EEF2F6',
        },
        text: {
          main: '#0F172A',
          muted: '#64748B',
          subtle: '#94A3B8',
        },
        border: {
          light: '#DCE4E8',
          subtle: '#E2E8F0',
        },
        semantic: {
          info: '#2563EB',
          success: '#15803D',
          warning: '#D97706',
          danger: '#DC2626',
          synthetic: '#6D5BD0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      borderRadius: {
        'card': '14px',
        'card-lg': '16px',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(15, 23, 42, 0.05), 0 1px 2px -1px rgba(15, 23, 42, 0.05)',
        'card-hover': '0 4px 6px -1px rgba(15, 23, 42, 0.08), 0 2px 4px -2px rgba(15, 23, 42, 0.06)',
        'modal': '0 20px 25px -5px rgba(15, 23, 42, 0.15), 0 8px 10px -6px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
}
