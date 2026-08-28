/** @type {import('tailwindcss').Config} */

// Brand tokens live in src/styles/tokens.css as CSS custom properties holding
// space-separated RGB channels. This helper maps them into the Tailwind theme
// so opacity modifiers (`bg-accent/40`) keep working.
const withOpacity = (variable) => `rgb(var(${variable}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: withOpacity('--c-ink'),
          800: withOpacity('--c-ink-800'),
          700: withOpacity('--c-ink-700'),
          600: withOpacity('--c-ink-600'),
        },
        /** Alternate section ground, one rung above `ink`. */
        surface: withOpacity('--c-surface'),
        bone: {
          DEFAULT: withOpacity('--c-bone'),
          200: withOpacity('--c-bone-200'),
          400: withOpacity('--c-bone-400'),
        },
        accent: {
          DEFAULT: withOpacity('--c-accent'),
          600: withOpacity('--c-accent-600'),
          300: withOpacity('--c-accent-300'),
          100: withOpacity('--c-accent-100'),
        },
        /**
         * Secondary accent for graphic marks. Brand green on the light theme.
         * `accent2-ink` is the variant safe for small text: the brand green is
         * too light to read at body size on a light ground.
         */
        accent2: {
          DEFAULT: withOpacity('--c-accent-2'),
          ink: withOpacity('--c-accent-2-ink'),
        },
        /**
         * Hairlines and glass fills. Replaces literal `white/N`, which is
         * invisible once the ground is white.
         */
        line: withOpacity('--c-line'),
        /** A ground that stays light in every theme, plus its text colour. */
        paper: {
          DEFAULT: withOpacity('--c-paper'),
          fg: withOpacity('--c-paper-fg'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)'],
      },
      // The default scale jumps in coarse steps; hairlines and glass surfaces
      // on a near-black base need finer control than 5% increments allow.
      opacity: {
        2: '0.02',
        4: '0.04',
        6: '0.06',
        8: '0.08',
        12: '0.12',
        15: '0.15',
        18: '0.18',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
      },
      fontSize: {
        mega: ['var(--fs-mega)', { lineHeight: '0.82', letterSpacing: '-0.045em' }],
        display: ['var(--fs-display)', { lineHeight: '0.88', letterSpacing: '-0.038em' }],
        h1: ['var(--fs-h1)', { lineHeight: '0.92', letterSpacing: '-0.035em' }],
        h2: ['var(--fs-h2)', { lineHeight: '0.95', letterSpacing: '-0.03em' }],
        h3: ['var(--fs-h3)', { lineHeight: '1.08', letterSpacing: '-0.02em' }],
        h4: ['var(--fs-h4)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        lead: ['var(--fs-lead)', { lineHeight: '1.55' }],
        body: ['var(--fs-body)', { lineHeight: '1.65' }],
        small: ['var(--fs-small)', { lineHeight: '1.55' }],
        eyebrow: ['var(--fs-eyebrow)', { lineHeight: '1', letterSpacing: '0.18em' }],
      },
      spacing: {
        section: 'var(--section-y)',
        gutter: 'var(--gutter)',
      },
      maxWidth: {
        shell: 'var(--maxw)',
        measure: '62ch',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        pill: 'var(--r-pill)',
      },
      boxShadow: {
        lift: 'var(--shadow-lift)',
        accent: 'var(--shadow-accent)',
      },
      transitionTimingFunction: {
        expo: 'var(--ease-out-expo)',
        quart: 'var(--ease-in-out-quart)',
      },
      keyframes: {
        'scroll-nudge': {
          '0%, 100%': { transform: 'translateY(0)', opacity: '0.85' },
          '50%': { transform: 'translateY(8px)', opacity: '0.35' },
        },
        'spin-slow': {
          to: { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'star-pop': {
          '0%': { transform: 'scale(0) rotate(-45deg)', opacity: '0' },
          '70%': { transform: 'scale(1.18) rotate(4deg)', opacity: '1' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
      },
      animation: {
        'scroll-nudge': 'scroll-nudge 2s var(--ease-in-out-quart) infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        shimmer: 'shimmer 2.4s linear infinite',
        // Runs once. The global reduced-motion block collapses it to nothing.
        'star-pop': 'star-pop 620ms var(--ease-out-expo) both',
      },
    },
  },
  plugins: [],
}
