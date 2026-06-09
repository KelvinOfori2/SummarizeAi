/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        brand: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        neon: {
          cyan:    '#00f5ff',
          teal:    '#14b8a6',
          purple:  '#a855f7',
          pink:    '#ec4899',
          amber:   '#f59e0b',
        },
        dark: {
          950: '#020817',
          900: '#0a1628',
          800: '#0d1f35',
          700: '#112240',
          600: '#1a3354',
          500: '#234068',
        },
      },
      backgroundImage: {
        'grid-pattern': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2300f5ff' fill-opacity='0.03'%3E%3Cpath d='M0 0h40v1H0zM0 0v40h1V0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
      },
      animation: {
        'float':        'float 6s ease-in-out infinite',
        'pulse-slow':   'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'glow':         'glow 2s ease-in-out infinite alternate',
        'scan':         'scan 3s linear infinite',
        'spin-slow':    'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%,100%': { transform: 'translateY(0px)' },
          '50%':     { transform: 'translateY(-20px)' },
        },
        glow: {
          from: { boxShadow: '0 0 10px #14b8a6, 0 0 20px #14b8a680' },
          to:   { boxShadow: '0 0 20px #14b8a6, 0 0 40px #14b8a680, 0 0 60px #14b8a640' },
        },
        scan: {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      boxShadow: {
        'neon-teal':   '0 0 20px rgba(20,184,166,0.4), 0 0 40px rgba(20,184,166,0.2)',
        'neon-purple': '0 0 20px rgba(168,85,247,0.4), 0 0 40px rgba(168,85,247,0.2)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)',
        'card':        '0 4px 24px rgba(0,0,0,0.3)',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
