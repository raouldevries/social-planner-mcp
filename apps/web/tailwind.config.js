/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary brand color - refined, less saturated blue
        primary: {
          50: '#f0f5ff',
          100: '#e0ebff',
          200: '#c7d9fe',
          300: '#a4c0fc',
          400: '#7a9ef8',
          500: '#5a7dee',
          600: '#4263d8',
          700: '#3651c4',
          800: '#30449f',
          900: '#2b3c7d',
          950: '#1d264c',
        },
        // Neutral palette - warmer grays for a softer feel
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          150: '#eeeeee',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
        // Status colors - muted, sophisticated palette
        status: {
          draft: {
            bg: '#f5f5f5',
            border: '#e5e5e5',
            text: '#737373',
            dot: '#a3a3a3',
          },
          pending: {
            bg: '#fffbeb',
            border: '#fde68a',
            text: '#92400e',
            dot: '#f59e0b',
          },
          approved: {
            bg: '#ecfdf5',
            border: '#a7f3d0',
            text: '#065f46',
            dot: '#10b981',
          },
          scheduled: {
            bg: '#f5f3ff',
            border: '#ddd6fe',
            text: '#5b21b6',
            dot: '#8b5cf6',
          },
          published: {
            bg: '#f0fdf4',
            border: '#bbf7d0',
            text: '#166534',
            dot: '#22c55e',
          },
          rejected: {
            bg: '#fef2f2',
            border: '#fecaca',
            text: '#991b1b',
            dot: '#ef4444',
          },
        },
        // Platform colors - slightly muted
        platform: {
          instagram: '#E1306C',
          linkedin: '#0077B5',
        },
        // Surface colors for layering
        surface: {
          primary: '#ffffff',
          secondary: '#fafafa',
          tertiary: '#f5f5f5',
          elevated: '#ffffff',
        },
      },
      fontFamily: {
        // System font stack prioritizing SF Pro on Apple devices
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'SF Pro Display',
          'SF Pro Text',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        // Monospace for technical content
        mono: [
          'SF Mono',
          'Monaco',
          'Inconsolata',
          'Fira Code',
          'monospace',
        ],
      },
      fontSize: {
        // Refined type scale following Apple's typography
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.005em' }],
        sm: ['0.8125rem', { lineHeight: '1.25rem', letterSpacing: '0' }],
        base: ['0.9375rem', { lineHeight: '1.5rem', letterSpacing: '-0.01em' }],
        lg: ['1.0625rem', { lineHeight: '1.625rem', letterSpacing: '-0.015em' }],
        xl: ['1.25rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.025em' }],
        '3xl': ['1.875rem', { lineHeight: '2.375rem', letterSpacing: '-0.03em' }],
        '4xl': ['2.25rem', { lineHeight: '2.75rem', letterSpacing: '-0.035em' }],
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        // Subtle, consistent radii
        'sm': '0.25rem',
        'DEFAULT': '0.375rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        // Layered, natural shadows
        'xs': '0 1px 2px rgba(0, 0, 0, 0.04)',
        'sm': '0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04)',
        'DEFAULT': '0 2px 4px rgba(0, 0, 0, 0.04), 0 4px 6px rgba(0, 0, 0, 0.03)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.04), 0 8px 15px rgba(0, 0, 0, 0.05)',
        'lg': '0 8px 16px rgba(0, 0, 0, 0.06), 0 16px 32px rgba(0, 0, 0, 0.04)',
        'xl': '0 16px 32px rgba(0, 0, 0, 0.08), 0 24px 48px rgba(0, 0, 0, 0.05)',
        // Elevated cards
        'card': '0 1px 3px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.08), 0 8px 24px rgba(0, 0, 0, 0.04)',
        // Inset for inputs
        'inner-sm': 'inset 0 1px 2px rgba(0, 0, 0, 0.05)',
      },
      animation: {
        // Smooth, physical animations
        'fade-in': 'fadeIn 0.2s ease-out forwards',
        'fade-out': 'fadeOut 0.15s ease-in forwards',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-out': 'scaleOut 0.15s ease-in forwards',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        scaleOut: {
          '0%': { opacity: '1', transform: 'scale(1)' },
          '100%': { opacity: '0', transform: 'scale(0.96)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
      transitionTimingFunction: {
        // Apple-style easing curves
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-expo': 'cubic-bezier(0.7, 0, 0.84, 0)',
        'bounce': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      transitionDuration: {
        '250': '250ms',
        '350': '350ms',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
