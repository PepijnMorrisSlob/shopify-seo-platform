/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom accent colors
        accent: {
          DEFAULT: '#10b981', // emerald-500
          light: '#34d399',   // emerald-400
          dark: '#059669',    // emerald-600
        },
      },
      animation: {
        'sidebar-expand': 'sidebar-expand 200ms ease-out',
        'sidebar-collapse': 'sidebar-collapse 200ms ease-out',
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 200ms ease-out',
      },
      keyframes: {
        'sidebar-expand': {
          '0%': { width: '64px' },
          '100%': { width: '240px' },
        },
        'sidebar-collapse': {
          '0%': { width: '240px' },
          '100%': { width: '64px' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
