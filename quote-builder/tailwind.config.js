/** @type {import('tailwindcss').Config} */
const c = (v) => `rgb(var(${v}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: c('--c-ground'),
        surface: c('--c-surface'),
        raise: c('--c-raise'),
        ink: c('--c-ink'),
        muted: c('--c-muted'),
        line: c('--c-line'),
        soft: c('--c-line-soft'),
        control: c('--c-control'),
        navy: { DEFAULT: c('--c-navy'), deep: c('--c-navy-deep'), wash: c('--c-navy-wash') },
        onnavy: c('--c-on-navy'),
        green: { DEFAULT: c('--c-green'), ink: c('--c-green-ink'), wash: c('--c-green-wash') },
        amber: { ink: c('--c-amber'), wash: c('--c-amber-wash') },
        hot: { ink: c('--c-hot'), wash: c('--c-hot-wash') },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        sans: ['var(--font-body)'],
      },
      borderRadius: { sm: '6px', md: '10px', lg: '14px' },
      boxShadow: {
        sheet: 'var(--shadow-sheet)',
        pop: 'var(--shadow-pop)',
      },
      transitionTimingFunction: { out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
}
