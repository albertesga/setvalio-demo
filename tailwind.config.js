/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Filmpilot. Identidad en hex para admitir opacidad; los semánticos leen las
        // variables de src/brand/filmpilot.css y cambian dentro de .flp-dark.
        flp: {
          carbon: '#141414',
          signal: '#FFE24A',
          chalk: '#F5F4EF',
          silver: '#B7BAB7',
          ink: 'var(--flp-text)',
          bg: 'var(--flp-bg)',
          surface: 'var(--flp-surface)',
          muted: 'var(--flp-muted)',
          line: 'var(--flp-border)',
          control: 'var(--flp-control-border)',
          error: 'var(--flp-error)',
          success: 'var(--flp-success)',
        },
      },
      fontFamily: {
        sans: ['Instrument Sans', 'Arial', 'sans-serif'],
        'flp-sans': ['Instrument Sans', 'Arial', 'sans-serif'],
        'flp-mono': ['Geist Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        'flp-sm': '6px',
        'flp-md': '16px',
        'flp-lg': '24px',
      },
    },
  },
  plugins: [],
}
