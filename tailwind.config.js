/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Lienzo
        canvas: '#FFFEFA',
        surface: '#F4F1E8',
        'surface-elevated': '#FFFEFA',
        // Tinta
        ink: '#311B2E',
        muted: '#655461',
        faint: '#655461',
        lima: '#D4F26A',
        'lima-ink': '#311B2E',
        // Acentos financieros
        primary: '#311B2E',
        'primary-hover': '#50304A',
        'primary-active': '#241122',
        'primary-disabled': '#BBAAB5',
        'primary-soft': '#F1E8ED',
        'mint-strong': '#3B805E',
        ease: '#F1E8ED',
        bloom: '#E3F5A4',
        pulse: '#D4F26A',
        depth: '#311B2E',
        cove: '#EED7C8',
        solea: '#F6E8C8',
        coral: '#F3DFDA',
        muse: '#E9E4F3',
        nimbus: '#DDE7F4',
        aeris: '#DDECF2',
        yellow: '#F6E8C8',
        peach: '#EED7C8',
        rose: '#F3DFDA',
        'blue-soft': '#DDECF2',
        'purple-soft': '#E9E4F3',
        info: '#315F83',
        'info-soft': '#E6F0F5',
        positive: '#236847',
        'positive-soft': '#E9F4EB',
        warning: '#91601C',
        'warning-soft': '#FCF2DD',
        negative: '#A8383D',
        'negative-soft': '#FBEAEC',
        line: 'rgb(49 27 46 / 0.18)',
        'line-strong': '#9A8492',
        // Filmpilot (portada y agentes). Identidad en hex para admitir opacidad;
        // los semánticos leen las variables de src/brand/filmpilot.css y cambian en .flp-dark.
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
        sans: ['Manrope', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Manrope', 'system-ui', 'sans-serif'],
        editorial: ['Newsreader', 'Georgia', 'serif'],
        'flp-sans': ['Instrument Sans', 'Arial', 'sans-serif'],
        'flp-mono': ['Geist Mono', 'Courier New', 'monospace'],
      },
      borderRadius: {
        sm: '6px',
        md: '6px',
        lg: '8px',
        xl: '10px',
        '2xl': '10px',
        'flp-sm': '6px',
        'flp-md': '16px',
        'flp-lg': '24px',
      },
      fontSize: {
        // Única medida custom en uso. La escala semántica (display/h1/h2/h3/h4/
        // body/caption/overline) se eliminó: no la usaba ninguna pantalla y
        // contradecía la tipografía real del producto (ver sección "Tipografía"
        // en src/screens/DesignSystem.jsx). La jerarquía se compone con utilidades
        // Tailwind por superficie, no con tokens semánticos.
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        card: '0 1px 2px rgba(49, 27, 46, 0.04), 0 5px 14px rgba(49, 27, 46, 0.04)',
        soft: '0 4px 14px rgba(49, 27, 46, 0.06)',
        modal: '0 24px 64px rgba(49, 27, 46, 0.18)',
        rail: '1px 0 0 0 rgba(49, 27, 46, 0.18)',
      },
      transitionTimingFunction: {
        fp: 'cubic-bezier(0.23, 1, 0.32, 1)',
      },
    },
  },
  plugins: [],
}
