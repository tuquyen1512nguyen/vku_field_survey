/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          900: '#070c18',
          800: '#0b132b',
          700: '#1c2541',
          600: '#2c3757',
        },
        electric: {
          500: '#0284c7',
          400: '#38bdf8',
          300: '#7dd3fc',
          600: '#0369a1',
        },
        field: {
          500: '#10b981',
          600: '#059669',
          400: '#34d399',
          100: '#ecfdf5',
        },
        canvas: '#f8fafc',
        status: {
          online: '#10b981',
          offline: '#f59e0b',
          syncing: '#38bdf8',
          error: '#ef4444',
          draft: '#94a3b8',
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'mission': '0 8px 30px rgba(11, 19, 43, 0.08)',
        'hud': '0 0 20px rgba(2, 132, 199, 0.2)',
        'field-glow': '0 0 25px rgba(16, 185, 129, 0.25)',
      }
    },
  },
  plugins: [],
}
