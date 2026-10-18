/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      /**
       * Semantic colour tokens driven by CSS variables (see src/index.css).
       *
       * Components say `bg-surface` or `text-muted`, never
       * `bg-white dark:bg-slate-900`, so light/dark stays a one-file concern and
       * an opacity modifier like `bg-primary/10` still works because the values
       * are raw RGB channels rather than hex.
       */
      colors: {
        background: 'rgb(var(--c-background) / <alpha-value>)',
        surface: {
          DEFAULT: 'rgb(var(--c-surface) / <alpha-value>)',
          muted: 'rgb(var(--c-surface-muted) / <alpha-value>)',
          raised: 'rgb(var(--c-surface-raised) / <alpha-value>)',
        },
        border: 'rgb(var(--c-border) / <alpha-value>)',
        foreground: 'rgb(var(--c-foreground) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        primary: {
          DEFAULT: 'rgb(var(--c-primary) / <alpha-value>)',
          soft: 'rgb(var(--c-primary-soft) / <alpha-value>)',
          fg: 'rgb(var(--c-primary-fg) / <alpha-value>)',
        },
        secondary: {
          DEFAULT: 'rgb(var(--c-secondary) / <alpha-value>)',
          soft: 'rgb(var(--c-secondary-soft) / <alpha-value>)',
        },
        success: {
          DEFAULT: 'rgb(var(--c-success) / <alpha-value>)',
          soft: 'rgb(var(--c-success-soft) / <alpha-value>)',
        },
        warning: {
          DEFAULT: 'rgb(var(--c-warning) / <alpha-value>)',
          soft: 'rgb(var(--c-warning-soft) / <alpha-value>)',
        },
        error: {
          DEFAULT: 'rgb(var(--c-error) / <alpha-value>)',
          soft: 'rgb(var(--c-error-soft) / <alpha-value>)',
        },
        /** Reserved for gamification, so the money screens stay sober. */
        gold: {
          DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)',
          soft: 'rgb(var(--c-gold-soft) / <alpha-value>)',
        },
        /** Gradient stop used by the primary button and hero accents. */
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
      },

      fontFamily: {
        sans: [
          'Inter Variable',
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        display: [
          'Plus Jakarta Sans Variable',
          'Plus Jakarta Sans',
          'Inter Variable',
          'ui-sans-serif',
          'system-ui',
          'sans-serif',
        ],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.375rem',
      },

      boxShadow: {
        card: '0 1px 2px 0 rgb(0 0 0 / 0.05), 0 1px 3px 0 rgb(0 0 0 / 0.06)',
        raised: '0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.07)',
        pop: '0 18px 40px -12px rgb(0 0 0 / 0.38), 0 4px 12px -4px rgb(0 0 0 / 0.22)',
        /** Colour glows - the main source of the "lit from within" dark look. */
        glow: '0 0 0 1px rgb(var(--c-primary) / 0.25), 0 8px 30px -8px rgb(var(--c-primary) / 0.55)',
        'glow-sm': '0 4px 16px -6px rgb(var(--c-primary) / 0.5)',
        'glow-lg': '0 0 0 1px rgb(var(--c-primary) / 0.2), 0 18px 60px -12px rgb(var(--c-primary) / 0.6)',
        'glow-gold': '0 0 0 1px rgb(var(--c-gold) / 0.25), 0 8px 26px -8px rgb(var(--c-gold) / 0.45)',
        /** Hairline highlight along the top edge of a glass card. */
        hairline: 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },

      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, rgb(var(--c-primary)) 0%, rgb(var(--c-secondary)) 100%)',
        'gradient-primary-soft':
          'linear-gradient(135deg, rgb(var(--c-primary) / 0.14) 0%, rgb(var(--c-secondary) / 0.14) 100%)',
        'gradient-gold': 'linear-gradient(135deg, rgb(var(--c-gold)) 0%, rgb(var(--c-warning)) 100%)',
        'gradient-aurora':
          'radial-gradient(60% 60% at 15% 0%, rgb(var(--c-primary) / 0.28) 0%, transparent 60%), radial-gradient(50% 50% at 85% 10%, rgb(var(--c-secondary) / 0.22) 0%, transparent 55%)',
      },

      transitionTimingFunction: {
        /** Slight overshoot - used for menus, tabs and dialogs. */
        swift: 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },

      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.94)' },
          '60%': { transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        /** Slow drift for the decorative background blobs. */
        aurora: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0) scale(1)' },
          '33%': { transform: 'translate3d(4%, -3%, 0) scale(1.06)' },
          '66%': { transform: 'translate3d(-3%, 3%, 0) scale(0.97)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
        'bar-grow': {
          from: { transform: 'scaleX(0)' },
          to: { transform: 'scaleX(1)' },
        },
        'marquee-x': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
      },

      animation: {
        'fade-in': 'fade-in 180ms ease-out both',
        'slide-up': 'slide-up 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 240ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'pop-in': 'pop-in 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        aurora: 'aurora 24s ease-in-out infinite',
        float: 'float 5s ease-in-out infinite',
        'glow-pulse': 'glow-pulse 4s ease-in-out infinite',
        'bar-grow': 'bar-grow 700ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'marquee-x': 'marquee-x 30s linear infinite',
      },
    },
  },
  plugins: [],
};
