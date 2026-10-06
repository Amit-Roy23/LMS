import type { Config } from 'tailwindcss';

/**
 * Light "academy" theme: warm cream surfaces, deep teal primary, coral accent.
 *
 * The UI was originally written against a dark palette, so the colour scales
 * below keep the same "dark-theme" semantics but in light values:
 *   - 950/900/800 shades (used as surfaces, tints and borders) are light.
 *   - 400/300/200 shades (used as foreground text) are dark and readable.
 *   - 500/600/700 shades stay solid brand colours for buttons and fills.
 */
const teal = {
  50: '#eef7f4',
  100: '#d6ece5',
  200: '#0a4a3f',
  300: '#0c574a',
  400: '#0f6b5a',
  500: '#14806b',
  600: '#0f6b5a',
  700: '#0b5246',
  800: '#cfe5de',
  900: '#e3f1ec',
  950: '#eef7f4',
};

const coral = {
  50: '#fff3ed',
  100: '#ffe3d6',
  200: '#a8401b',
  300: '#c24e25',
  400: '#e0602f',
  500: '#f7845e',
  600: '#f26f43',
  700: '#d85a30',
  800: '#fbd5c4',
  900: '#fde6dc',
  950: '#fff3ed',
};

const aqua = {
  50: '#ecf7f7',
  100: '#d3eeee',
  200: '#0d5a5e',
  300: '#106a6f',
  400: '#137b81',
  500: '#1a959c',
  600: '#147f85',
  700: '#106469',
  800: '#c2e4e5',
  900: '#dcf0f1',
  950: '#ecf7f7',
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
        ink: '#12302b',
        cream: {
          DEFAULT: '#fff8f3',
          100: '#fff3ec',
          200: '#fde9df',
        },
        primary: { DEFAULT: '#0f6b5a', foreground: '#ffffff', ...teal },
        brand: { DEFAULT: '#0f6b5a', dark: '#0b4f43', ...teal },
        coral: { DEFAULT: '#f7845e', ...coral },
        surface: {
          dark: '#fff8f3',
          card: '#ffffff',
          cardHover: '#fff3ec',
          border: '#f0e2d8',
          borderLight: '#e8d6ca',
        },
        // Neutral scale (inverted: high numbers are light surfaces, low numbers are dark ink)
        slate: {
          50: '#12302b',
          100: '#12302b',
          200: '#1f3d38',
          300: '#3a524d',
          400: '#5c6e6a',
          500: '#7d8b87',
          600: '#a39c97',
          700: '#e5d5ca',
          800: '#f0e2d8',
          850: '#fff3ec',
          900: '#ffffff',
          950: '#fff8f3',
        },
        blue: teal,
        indigo: teal,
        sky: teal,
        violet: coral,
        purple: coral,
        cyan: aqua,
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
          blue: '#0f6b5a',
          emerald: '#059669',
          amber: '#d97706',
          purple: '#f26f43',
          rose: '#e11d48',
          cyan: '#147f85',
        },
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem',
        xl: '0.875rem',
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      fontFamily: {
        sans: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Labels previously used a monospace "terminal" look; the new theme keeps them friendly
        mono: ['Poppins', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        code: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      boxShadow: {
        soft: '0 10px 30px -12px rgba(18, 48, 43, 0.18)',
        card: '0 4px 18px -6px rgba(18, 48, 43, 0.10)',
      },
    },
  },
  plugins: [],
};

export default config;
