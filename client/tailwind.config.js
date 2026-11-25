/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        petrol: {
          DEFAULT: '#001219',
          midnight: '#001219',
          surface: '#001A24',
          border: '#002633',
        },
        ocean: {
          DEFAULT: '#005F73',
          deep: '#005F73',
          light: '#0A738A',
        },
        mineral: {
          DEFAULT: '#0A9396',
          teal: '#0A9396',
          hover: '#087B7E',
        },
        seafoam: {
          DEFAULT: '#94D2BD',
          soft: '#EAF6F2',
        },
        sandstone: {
          DEFAULT: '#E9D8A6',
          soft: '#FAF5E8',
        },
        amber: {
          solar: '#EE9B00',
          DEFAULT: '#EE9B00',
          soft: '#FDF5E6',
        },
        ochre: {
          burnt: '#CA6702',
          DEFAULT: '#CA6702',
        },
        rust: {
          DEFAULT: '#BB3E03',
        },
        vermilion: {
          deep: '#AE2012',
          DEFAULT: '#AE2012',
        },
        ember: {
          red: '#9B2226',
          DEFAULT: '#9B2226',
        },
        industrial: {
          bg: '#F8FAFC',
          card: '#FFFFFF',
          border: '#E2E8F0',
          borderLight: '#F1F5F9',
          text: '#0F172A',
          muted: '#475569',
        },
        navy: {
          sidebar: '#0B1320',
          hover: '#1E293B',
          dark: '#0B1320',
        },
        primary: {
          teal: '#0A9396',
          tealDark: '#005F73',
          tealLight: '#94D2BD',
          softTeal: '#F0FDFA',
        },
        canvas: {
          bg: '#F8FAFC',
          surface: '#FFFFFF',
          subtle: '#F1F5F9',
        },
        text: {
          main: '#0F172A',
          muted: '#475569',
          subtle: '#64748B',
        },
        border: {
          light: '#E2E8F0',
          subtle: '#F1F5F9',
        },
        semantic: {
          info: '#005F73',
          success: '#0A9396',
          warning: '#EE9B00',
          danger: '#AE2012',
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
        'card': '0 1px 3px 0 rgba(38, 50, 55, 0.04), 0 1px 2px -1px rgba(38, 50, 55, 0.04)',
        'card-hover': '0 6px 12px -2px rgba(38, 50, 55, 0.08), 0 3px 6px -3px rgba(38, 50, 55, 0.05)',
        'modal': '0 20px 25px -5px rgba(0, 18, 25, 0.2), 0 8px 10px -6px rgba(0, 18, 25, 0.1)',
      },
    },
  },
  plugins: [],
};
