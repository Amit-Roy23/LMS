import type { Config } from 'tailwindcss';

/**
 * ADSIGN brand theme: white surfaces on a light gray canvas, ADSIGN primary blue (#0063AD)
 * with supporting bright blue (#0077BF), ADSIGN red (#E71E24) and red-orange (#E93E08)
 * accents, and charcoal (#171C24, the "night" scale) for hero sections, sidebars, the
 * footer and the video player.
 *
 * The `indigo`/`blue` scales carry the ADSIGN blues, `violet`/`purple`/`pink` carry the
 * ADSIGN reds and `sky`/`cyan` the bright blue, so existing class names pick up the brand.
 *
 * The UI was originally written against a dark palette, so the light-mode colour scales
 * below keep that "dark-theme" naming but carry light values:
 *   - 950/900/850/800 shades (used as surfaces, tints and borders) are light.
 *   - 400/300/200/100 shades (used as foreground text) are dark and readable.
 *   - 500/600/700 shades stay solid brand colours for buttons and fills.
 * Use the `night` scale (a true dark scale) for genuinely dark surfaces.
 */
const indigo = {
  50: '#F0F7FC',
  100: '#DCEEF9',
  200: '#003F70',
  300: '#00508C',
  400: '#0063AD',
  500: '#0077BF',
  600: '#0063AD',
  700: '#00528F',
  800: '#B9DBF1',
  900: '#DCEEF9',
  950: '#F0F7FC',
};

const violet = {
  50: '#FFF2EE',
  100: '#FFE1D9',
  200: '#8E1014',
  300: '#B5161B',
  400: '#E71E24',
  500: '#E93E08',
  600: '#E71E24',
  700: '#C4161B',
  800: '#FBC4B5',
  900: '#FFE1D9',
  950: '#FFF2EE',
};

const sky = {
  50: '#EEF8FD',
  100: '#D6EEFA',
  200: '#004A75',
  300: '#005F94',
  400: '#0077BF',
  500: '#1A8FD6',
  600: '#0077BF',
  700: '#00629E',
  800: '#B3DDF3',
  900: '#D6EEFA',
  950: '#EEF8FD',
};

/** A true dark scale for dark surfaces (hero, sidebar, footer, video player). */
const night = {
  DEFAULT: '#171C24',
  50: '#F5F7FA',
  100: '#F1F4F8',
  200: '#E2E8F0',
  300: '#CBD5E1',
  400: '#94A3B8',
  500: '#64748B',
  600: '#4A5363',
  700: '#343C4B',
  800: '#222936',
  900: '#171C24',
  950: '#10141A',
};

const amber = {
  50: '#fffbeb',
  100: '#fef3c7',
  200: '#92400e',
  300: '#b45309',
  400: '#d97706',
  500: '#f59e0b',
  600: '#d97706',
  700: '#b45309',
  800: '#fde68a',
  900: '#fef3c7',
  950: '#fffbeb',
};

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/providers/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // Main heading/body ink colour
        ink: '#171C24',
        night,
        brand: { DEFAULT: '#0063AD', dark: '#00528F', bright: '#0077BF', red: '#E71E24', orange: '#E93E08', ...indigo },
        primary: { DEFAULT: '#0063AD', foreground: '#ffffff', ...indigo },
        // Earlier theme token names, mapped onto the academy palette
        cream: { DEFAULT: '#F5F7FA', 50: '#FFFFFF', 100: '#F0F7FC', 200: '#E2E8F0' },
        plum: { ...night, DEFAULT: '#171C24', 500: '#222936' },
        rust: { DEFAULT: '#0063AD', ...indigo },
        peach: { DEFAULT: '#f59e0b', ...amber },
        coral: { DEFAULT: '#f59e0b', ...amber },
        pink: { DEFAULT: '#E71E24', ...violet },
        surface: {
          dark: '#F5F7FA',
          card: '#ffffff',
          cardHover: '#f1f5f9',
          border: '#e2e8f0',
          borderLight: '#cbd5e1',
        },
        // Neutral scale (inverted: high numbers are light surfaces, low numbers are dark ink)
        slate: {
          50: '#171C24',
          100: '#171C24',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          850: '#f1f5f9',
          900: '#ffffff',
          950: '#F5F7FA',
        },
        blue: indigo,
        indigo,
        violet,
        purple: violet,
        sky,
        cyan: sky,
        amber,
        emerald: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#065f46',
          300: '#047857',
          400: '#059669',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#a7f3d0',
          900: '#d1fae5',
          950: '#ecfdf5',
        },
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#9f1239',
          300: '#be123c',
          400: '#e11d48',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#fecdd3',
          900: '#ffe4e6',
          950: '#fff1f2',
        },
        accent: {
          blue: '#0063AD',
          emerald: '#059669',
          amber: '#d97706',
          purple: '#E71E24',
          rose: '#e11d48',
          cyan: '#0077BF',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '0.875rem',
        '2xl': '1.125rem',
        '3xl': '1.5rem',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Labels previously used a monospace "terminal" look; the theme keeps them friendly
        mono: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        code: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        soft: '0 12px 32px -12px rgba(0, 99, 173, 0.35)',
        card: '0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px -12px rgba(15, 23, 42, 0.12)',
        lift: '0 20px 40px -18px rgba(15, 23, 42, 0.28)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
        'gradient-pan': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        marquee: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.5s ease-out both',
        'scale-in': 'scale-in 0.35s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-right': 'slide-in-right 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.22, 1, 0.36, 1) both',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 1.4s linear infinite',
        'gradient-pan': 'gradient-pan 8s ease infinite',
        marquee: 'marquee 40s linear infinite',
      },
    },
  },
  plugins: [],
};

export default config;
