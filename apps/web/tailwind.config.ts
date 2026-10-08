import type { Config } from 'tailwindcss';

/**
 * "Academy" theme: clean white surfaces on a cool slate canvas, an indigo → violet brand
 * gradient, amber highlights and a deep navy ("night") for hero sections, sidebars,
 * the footer and the video player.
 *
 * The UI was originally written against a dark palette, so the light-mode colour scales
 * below keep that "dark-theme" naming but carry light values:
 *   - 950/900/850/800 shades (used as surfaces, tints and borders) are light.
 *   - 400/300/200/100 shades (used as foreground text) are dark and readable.
 *   - 500/600/700 shades stay solid brand colours for buttons and fills.
 * Use the `night` scale (a true dark scale) for genuinely dark surfaces.
 */
const indigo = {
  50: '#eef2ff',
  100: '#e0e7ff',
  200: '#3730a3',
  300: '#4338ca',
  400: '#4f46e5',
  500: '#6366f1',
  600: '#4f46e5',
  700: '#4338ca',
  800: '#c7d2fe',
  900: '#e0e7ff',
  950: '#eef2ff',
};

const violet = {
  50: '#f5f3ff',
  100: '#ede9fe',
  200: '#5b21b6',
  300: '#6d28d9',
  400: '#7c3aed',
  500: '#8b5cf6',
  600: '#7c3aed',
  700: '#6d28d9',
  800: '#ddd6fe',
  900: '#ede9fe',
  950: '#f5f3ff',
};

const sky = {
  50: '#f0f9ff',
  100: '#e0f2fe',
  200: '#075985',
  300: '#0369a1',
  400: '#0284c7',
  500: '#0ea5e9',
  600: '#0284c7',
  700: '#0369a1',
  800: '#bae6fd',
  900: '#e0f2fe',
  950: '#f0f9ff',
};

/** A true dark scale for dark surfaces (hero, sidebar, footer, video player). */
const night = {
  DEFAULT: '#0f172a',
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
  950: '#0b1020',
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
        ink: '#0f172a',
        night,
        brand: { DEFAULT: '#4f46e5', dark: '#4338ca', ...indigo },
        primary: { DEFAULT: '#4f46e5', foreground: '#ffffff', ...indigo },
        // Earlier theme token names, mapped onto the academy palette
        cream: { DEFAULT: '#f8fafc', 50: '#ffffff', 100: '#f1f5f9', 200: '#e2e8f0' },
        plum: { ...night, DEFAULT: '#0f172a', 500: '#1e293b' },
        rust: { DEFAULT: '#4f46e5', ...indigo },
        peach: { DEFAULT: '#f59e0b', ...amber },
        coral: { DEFAULT: '#f59e0b', ...amber },
        pink: { DEFAULT: '#8b5cf6', ...violet },
        surface: {
          dark: '#f8fafc',
          card: '#ffffff',
          cardHover: '#f1f5f9',
          border: '#e2e8f0',
          borderLight: '#cbd5e1',
        },
        // Neutral scale (inverted: high numbers are light surfaces, low numbers are dark ink)
        slate: {
          50: '#0f172a',
          100: '#0f172a',
          200: '#1e293b',
          300: '#334155',
          400: '#475569',
          500: '#64748b',
          600: '#94a3b8',
          700: '#cbd5e1',
          800: '#e2e8f0',
          850: '#f1f5f9',
          900: '#ffffff',
          950: '#f8fafc',
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
          blue: '#4f46e5',
          emerald: '#059669',
          amber: '#d97706',
          purple: '#7c3aed',
          rose: '#e11d48',
          cyan: '#0284c7',
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
        soft: '0 12px 32px -12px rgba(79, 70, 229, 0.35)',
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
