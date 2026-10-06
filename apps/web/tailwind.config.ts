import type { Config } from 'tailwindcss';

/**
 * Warm "maker" theme: cream surfaces, deep plum ink, rust/terracotta, peach and pink accents.
 *
 * The UI was originally written against a dark palette, so the colour scales
 * below keep the same "dark-theme" semantics but in light values:
 *   - 950/900/800 shades (used as surfaces, tints and borders) are light.
 *   - 400/300/200 shades (used as foreground text) are dark and readable.
 *   - 500/600/700 shades stay solid brand colours for buttons and fills.
 */
const rust = {
  50: '#fbede4',
  100: '#f5d7c5',
  200: '#7a3317',
  300: '#8f3d1d',
  400: '#a84a24',
  500: '#c25e33',
  600: '#b4532a',
  700: '#9a4322',
  800: '#efcdb8',
  900: '#f7e2d3',
  950: '#fbefe6',
};

const peach = {
  50: '#fef1e8',
  100: '#fce5d6',
  200: '#9a4a1e',
  300: '#b85a26',
  400: '#cf672c',
  500: '#f6a06c',
  600: '#ee8b53',
  700: '#d9763e',
  800: '#fad4bc',
  900: '#fce5d6',
  950: '#fef1e8',
};

const pink = {
  50: '#fdeff5',
  100: '#fce0ec',
  200: '#8e1f52',
  300: '#a62862',
  400: '#c03474',
  500: '#ec6fa6',
  600: '#db4f8e',
  700: '#b83a74',
  800: '#f8c6dc',
  900: '#fce0ec',
  950: '#fdeff5',
};

const plum = {
  50: '#f6edf0',
  100: '#ead7de',
  200: '#2f0f1f',
  300: '#3d1a2b',
  400: '#4a1a32',
  500: '#5c2340',
  600: '#2f0f1f',
  700: '#240a17',
  800: '#e2ccd4',
  900: '#efe2e6',
  950: '#f6edf0',
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
        ink: '#2f0f1f',
        cream: {
          DEFAULT: '#fbf3e6',
          50: '#fffbf4',
          100: '#f6ead8',
          200: '#f1e1ca',
        },
        plum: { DEFAULT: '#2f0f1f', ...plum },
        rust: { DEFAULT: '#b4532a', ...rust },
        peach: { DEFAULT: '#f6a06c', ...peach },
        pink: { DEFAULT: '#ec6fa6', ...pink },
        primary: { DEFAULT: '#2f0f1f', foreground: '#fbf3e6', ...plum },
        brand: { DEFAULT: '#2f0f1f', dark: '#4a1a32', ...plum },
        coral: { DEFAULT: '#f6a06c', ...peach },
        surface: {
          dark: '#fbf3e6',
          card: '#fffbf4',
          cardHover: '#f6ead8',
          border: '#eadac4',
          borderLight: '#dcc6a9',
        },
        // Neutral scale (inverted: high numbers are light surfaces, low numbers are dark ink)
        slate: {
          50: '#2f0f1f',
          100: '#2f0f1f',
          200: '#3d1a2b',
          300: '#5a3a47',
          400: '#74585f',
          500: '#977c80',
          600: '#b9a6a3',
          700: '#e0ccb2',
          800: '#eadac4',
          850: '#f6ead8',
          900: '#fffbf4',
          950: '#fbf3e6',
        },
        blue: rust,
        indigo: rust,
        sky: rust,
        violet: peach,
        purple: peach,
        cyan: pink,
        emerald: {
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
        amber: {
          200: '#92400e',
          300: '#b45309',
          400: '#d97706',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#fde68a',
          900: '#fef3c7',
          950: '#fffbeb',
        },
        rose: {
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
          blue: '#b4532a',
          emerald: '#059669',
          amber: '#d97706',
          purple: '#ee8b53',
          rose: '#e11d48',
          cyan: '#db4f8e',
        },
      },
      borderRadius: {
        lg: '0.75rem',
        md: '0.625rem',
        sm: '0.375rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Bricolage Grotesque"', '"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Labels previously used a monospace "terminal" look; the new theme keeps them friendly
        mono: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        code: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(47, 15, 31, 0.22)',
        card: '0 4px 18px -6px rgba(47, 15, 31, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
