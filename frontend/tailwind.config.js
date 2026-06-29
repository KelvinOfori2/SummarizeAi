/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"IBM Plex Serif"', 'Georgia', 'serif'],
        body:    ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // brand → amber: warm, editorial, unexpected for a tech tool
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
          950: '#451a03',
        },
        // dark → warm stone charcoal
        dark: {
          950: '#0c0a09',
          900: '#1c1917',
          800: '#292524',
          700: '#44403c',
          600: '#57534e',
          500: '#78716c',
        },
        // neon references neutralised — no glow, just amber
        neon: {
          cyan:   '#f59e0b',
          teal:   '#f59e0b',
          purple: '#a78bfa',
          pink:   '#f472b6',
          amber:  '#f59e0b',
        },
      },
      backgroundImage: {},
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'spin-slow':  'spin 8s linear infinite',
      },
      keyframes: {},
      boxShadow: {
        'card':        '0 1px 3px rgba(0,0,0,0.5)',
        'modal':       '0 20px 60px rgba(0,0,0,0.7)',
        'glass':       '0 1px 3px rgba(0,0,0,0.4)',
        'neon-teal':   'none',
        'neon-purple': 'none',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
