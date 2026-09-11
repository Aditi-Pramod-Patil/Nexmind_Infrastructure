/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F5F7FA',
        'primary-dark': '#0B1F33',
        'secondary-dark': '#172B3A',
        slate: {
          DEFAULT: '#334155',
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        muted: '#64748B',
        border: '#E2E8F0',
        'primary-accent': '#2563EB',
        success: '#16A34A',
        warning: '#D97706',
        danger: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'card': '12px',
        'card-lg': '16px',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(11, 31, 51, 0.05), 0 1px 2px 0 rgba(11, 31, 51, 0.03)',
        'card': '0 4px 6px -1px rgba(11, 31, 51, 0.05), 0 2px 4px -1px rgba(11, 31, 51, 0.03)',
        'card-hover': '0 10px 25px -5px rgba(11, 31, 51, 0.1), 0 8px 10px -6px rgba(11, 31, 51, 0.05)',
        'modal': '0 20px 25px -5px rgba(11, 31, 51, 0.15), 0 10px 10px -5px rgba(11, 31, 51, 0.08)',
      }
    },
  },
  plugins: [],
}
