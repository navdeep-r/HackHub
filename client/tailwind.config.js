/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Twitter-inspired color palette
        twitter: {
          blue: {
            50: '#e1f5fe',
            100: '#b3e5fc',
            200: '#81d4fa',
            300: '#4fc3f7',
            400: '#29b6f6',
            500: '#1da1f2', // Twitter Blue
            600: '#1976d2',
            700: '#1565c0',
            800: '#0d47a1',
            900: '#01579b',
          },
          dark: {
            50: '#f7f9fa',
            100: '#e1e8ed',
            200: '#aab8c2',
            300: '#657786',
            400: '#536471',
            500: '#3d4852',
            600: '#253341',
            700: '#192734',
            800: '#15202b', // Twitter dark background
            900: '#0f1419', // Twitter darker background
          },
          light: {
            50: '#ffffff',
            100: '#f7f9fa',
            200: '#e1e8ed',
            300: '#aab8c2',
            400: '#657786',
            500: '#536471',
            600: '#3d4852',
            700: '#253341',
            800: '#192734',
            900: '#0f1419',
          },
          green: {
            50: '#e8f5e8',
            100: '#c3e6c3',
            200: '#9dd99d',
            300: '#77cc77',
            400: '#5cb85c',
            500: '#00ba7c', // Twitter green
            600: '#00a85a',
            700: '#008f4f',
            800: '#007743',
            900: '#005f37',
          },
          red: {
            50: '#fef2f2',
            100: '#fee2e2',
            200: '#fecaca',
            300: '#fca5a5',
            400: '#f87171',
            500: '#f91880', // Twitter pink/red
            600: '#e11d48',
            700: '#be185d',
            800: '#9f1239',
            900: '#881337',
          },
          orange: {
            50: '#fff7ed',
            100: '#ffedd5',
            200: '#fed7aa',
            300: '#fdba74',
            400: '#fb923c',
            500: '#ff6600', // Twitter orange
            600: '#ea580c',
            700: '#c2410c',
            800: '#9a3412',
            900: '#7c2d12',
          },
          yellow: {
            50: '#fffbeb',
            100: '#fef3c7',
            200: '#fde68a',
            300: '#fcd34d',
            400: '#fbbf24',
            500: '#ffad1f', // Twitter yellow
            600: '#d97706',
            700: '#b45309',
            800: '#92400e',
            900: '#78350f',
          },
          purple: {
            50: '#faf5ff',
            100: '#f3e8ff',
            200: '#e9d5ff',
            300: '#d8b4fe',
            400: '#c084fc',
            500: '#794bc4', // Twitter purple
            600: '#9333ea',
            700: '#7c3aed',
            800: '#6b21a8',
            900: '#581c87',
          }
        },
        // Legacy colors for backward compatibility
        primary: {
          50: '#e1f5fe',
          100: '#b3e5fc',
          200: '#81d4fa',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#1da1f2',
          600: '#1976d2',
          700: '#1565c0',
          800: '#0d47a1',
          900: '#01579b',
        },
        secondary: {
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#794bc4',
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8',
          900: '#581c87',
        }
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
