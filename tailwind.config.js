/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // shadcn / Radix compat
        border:      "hsl(var(--border))",
        input:       "hsl(var(--input))",
        ring:        "hsl(var(--ring))",
        background:  "hsl(var(--background))",
        foreground:  "hsl(var(--foreground))",
        primary: {
          DEFAULT:    "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT:    "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT:    "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT:    "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT:    "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT:    "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // ── Freelax brand semantic tokens ──────────────────────────────
        'brand-primary':        'var(--brand-primary)',
        'brand-primary-hover':  'var(--brand-primary-hover)',
        'brand-primary-active': 'var(--brand-primary-active)',
        'brand-accent':         'var(--brand-accent)',
        'brand-accent-hover':   'var(--brand-accent-hover)',
        'brand-accent-active':  'var(--brand-accent-active)',

        // ── Surface tokens ─────────────────────────────────────────────
        'surface-paper':   'var(--surface-paper)',
        'surface-card':    'var(--surface-card)',
        'surface-sunken':  'var(--surface-sunken)',

        // ── Text tokens ────────────────────────────────────────────────
        'text-primary':   'var(--text-primary)',
        'text-body':      'var(--text-body)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted':     'var(--text-muted)',
        'text-disabled':  'var(--text-disabled)',
        'text-on-dark':   'var(--text-on-dark)',
        'text-on-accent': 'var(--text-on-accent)',

        // ── Border tokens ──────────────────────────────────────────────
        'border-default': 'var(--border-default)',
        'border-subtle':  'var(--border-subtle)',
        'border-strong':  'var(--border-strong)',
        'border-focus':   'var(--border-focus)',

        // ── Status tokens ──────────────────────────────────────────────
        'success-50':  'var(--success-50)',
        'success-500': 'var(--success-500)',
        'success-700': 'var(--success-700)',
        'warning-50':  'var(--warning-50)',
        'warning-500': 'var(--warning-500)',
        'warning-700': 'var(--warning-700)',
        'danger-50':   'var(--danger-50)',
        'danger-500':  'var(--danger-500)',
        'danger-700':  'var(--danger-700)',

        // ── Forest ramp ────────────────────────────────────────────────
        'forest-50':  'var(--forest-50)',
        'forest-100': 'var(--forest-100)',
        'forest-200': 'var(--forest-200)',
        'forest-300': 'var(--forest-300)',
        'forest-400': 'var(--forest-400)',
        'forest-500': 'var(--forest-500)',
        'forest-600': 'var(--forest-600)',
        'forest-700': 'var(--forest-700)',
        'forest-800': 'var(--forest-800)',
        'forest-900': 'var(--forest-900)',
        'forest-950': 'var(--forest-950)',

        // ── Cream ramp ─────────────────────────────────────────────────
        'cream-50':  'var(--cream-50)',
        'cream-100': 'var(--cream-100)',
        'cream-200': 'var(--cream-200)',
        'cream-300': 'var(--cream-300)',
        'cream-400': 'var(--cream-400)',
        'cream-500': 'var(--cream-500)',
        'cream-600': 'var(--cream-600)',
        'cream-700': 'var(--cream-700)',
        'cream-800': 'var(--cream-800)',
        'cream-900': 'var(--cream-900)',
      },

      fontFamily: {
        serif: ['var(--font-serif)'],
        sans:  ['var(--font-sans)'],
        mono:  ['var(--font-mono)'],
      },

      fontSize: {
        '2xs': 'var(--text-2xs)',
        'ds-xs':   'var(--text-xs)',
        'ds-sm':   'var(--text-sm)',
        'ds-base': 'var(--text-base)',
        'ds-md':   'var(--text-md)',
        'ds-lg':   'var(--text-lg)',
        'ds-xl':   'var(--text-xl)',
        'ds-2xl':  'var(--text-2xl)',
        'ds-3xl':  'var(--text-3xl)',
      },

      borderRadius: {
        'none': 'var(--radius-none)',
        'xs':   'var(--radius-xs)',
        'sm':   'var(--radius-sm)',
        DEFAULT: 'var(--radius-md)',
        'md':   'var(--radius-md)',
        'lg':   'var(--radius-lg)',
        'xl':   'var(--radius-xl)',
        '2xl':  'var(--radius-2xl)',
        'full': 'var(--radius-full)',
      },

      boxShadow: {
        'xs':      'var(--shadow-xs)',
        'sm':      'var(--shadow-sm)',
        DEFAULT:   'var(--shadow-md)',
        'md':      'var(--shadow-md)',
        'lg':      'var(--shadow-lg)',
        'xl':      'var(--shadow-xl)',
        'inset':   'var(--shadow-inset)',
      },

      transitionDuration: {
        'fast':    '120ms',
        'default': '200ms',
        'slow':    '400ms',
      },

      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to:   { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to:   { height: 0 },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
