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
      // ── Spacing ──────────────────────────────────────────────────────────
      // Overrides the same-named keys in Tailwind's default scale so that
      // p-4, gap-3, mx-6 etc. resolve to var(--space-N) and can be tuned
      // globally via globals.css without touching component files.
      spacing: {
        '0':    'var(--space-0)',
        'px':   'var(--space-px)',
        '0.5':  'var(--space-0-5)',
        '1':    'var(--space-1)',
        '1.5':  'var(--space-1-5)',
        '2':    'var(--space-2)',
        '3':    'var(--space-3)',
        '4':    'var(--space-4)',
        '5':    'var(--space-5)',
        '6':    'var(--space-6)',
        '7':    'var(--space-7)',
        '8':    'var(--space-8)',
        '9':    'var(--space-9)',
        '10':   'var(--space-10)',
        '12':   'var(--space-12)',
        '14':   'var(--space-14)',
        '16':   'var(--space-16)',
        '20':   'var(--space-20)',
        '24':   'var(--space-24)',
      },

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
        'border-hover':   'var(--border-hover)',
        'border-subtle':  'var(--border-subtle)',
        'border-strong':  'var(--border-strong)',
        'border-focus':   'var(--border-focus)',

        // ── Status tokens ──────────────────────────────────────────────
        'success-50':  'var(--success-50)',
        'success-100': 'var(--success-100)',
        'success-200': 'var(--success-200)',
        'success-500': 'var(--success-500)',
        'success-600': 'var(--success-600)',
        'success-700': 'var(--success-700)',
        'success-800': 'var(--success-800)',
        'warning-50':  'var(--warning-50)',
        'warning-100': 'var(--warning-100)',
        'warning-200': 'var(--warning-200)',
        'warning-500': 'var(--warning-500)',
        'warning-600': 'var(--warning-600)',
        'warning-700': 'var(--warning-700)',
        'warning-800': 'var(--warning-800)',
        'danger-50':   'var(--danger-50)',
        'danger-100':  'var(--danger-100)',
        'danger-200':  'var(--danger-200)',
        'danger-500':  'var(--danger-500)',
        'danger-600':  'var(--danger-600)',
        'danger-700':  'var(--danger-700)',
        'danger-800':  'var(--danger-800)',
        'info-50':     'var(--info-50)',
        'info-100':    'var(--info-100)',
        'info-200':    'var(--info-200)',
        'info-500':    'var(--info-500)',
        'info-600':    'var(--info-600)',
        'info-700':    'var(--info-700)',
        'info-800':    'var(--info-800)',

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
        serif:   ['var(--font-serif)'],
        sans:    ['var(--font-sans)'],
        display: ['var(--font-serif)'], // alias — use font-display for wordmark / hero
      },

      fontSize: {
        // ── Freelax type scale ────────────────────────────────────────
        // All sizes ship with lineHeight + letterSpacing baked in.
        // Use these exclusively — avoid arbitrary text-[Npx] values.
        'micro':   ['0.625rem',  { lineHeight: '1.3',  letterSpacing: '0' }],       // 10px
        'caption': ['0.6875rem', { lineHeight: '1.4',  letterSpacing: '0' }],       // 11px
        'xs':      ['0.75rem',   { lineHeight: '1.45', letterSpacing: '0' }],       // 12px
        'sm':      ['0.8125rem', { lineHeight: '1.5',  letterSpacing: '0' }],       // 13px — default body
        'base':    ['0.9375rem', { lineHeight: '1.55', letterSpacing: '-0.01em' }], // 15px
        'lg':      ['1.125rem',  { lineHeight: '1.4',  letterSpacing: '-0.015em' }],// 18px
        'xl':      ['1.375rem',  { lineHeight: '1.3',  letterSpacing: '-0.02em' }], // 22px
        '2xl':     ['1.75rem',   { lineHeight: '1.2',  letterSpacing: '-0.025em' }],// 28px
        '3xl':     ['2.25rem',   { lineHeight: '1.15', letterSpacing: '-0.03em' }], // 36px
      },

      // ── Line-height ───────────────────────────────────────────────────────
      // Mirrors --leading-* tokens in globals.css so leading-body, leading-heading
      // etc. resolve to the same values used in inline styles.
      lineHeight: {
        'display':  'var(--leading-display)', // 1.15 — hero numbers, large serif
        'heading':  'var(--leading-heading)', // 1.30 — card titles, section heads
        'body':     'var(--leading-body)',    // 1.50 — default body text
        'relaxed':  'var(--leading-relaxed)', // 1.65 — long-form prose
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
        '3xl':  'var(--radius-3xl)',
        'full': 'var(--radius-full)',
      },

      boxShadow: {
        'xs':           'var(--shadow-xs)',
        'sm':           'var(--shadow-sm)',
        DEFAULT:        'var(--shadow-md)',
        'md':           'var(--shadow-md)',
        'lg':           'var(--shadow-lg)',
        'xl':           'var(--shadow-xl)',
        'inset':        'var(--shadow-inset)',
        // ── Named elevation tokens ─────────────────────────────────────
        'card':         '0 2px 8px rgba(0,0,0,0.08)',
        'card-sm':      '0 1px 3px rgba(0,0,0,0.05)',
        'card-public':  '0 1px 3px rgba(0,0,0,0.06), 0 8px 32px rgba(0,0,0,0.04)',
        'modal':        '0 24px 64px rgba(0,0,0,0.18)',
        'popover':      '0 8px 24px rgba(0,0,0,0.10)',
        'overlay':      '0 8px 32px rgba(0,0,0,0.12)',
        'overlay-dark': '0 8px 32px rgba(0,0,0,0.24)',
        'tooltip':      '0 8px 20px rgba(0,0,0,0.15)',
        'sheet-bottom': '0 -4px 32px rgba(0,0,0,0.15)',
        'slide-left':   '-4px 0 24px rgba(0,0,0,0.12)',
        'btn-dark':     '0 2px 8px rgba(0,0,0,0.18)',
      },

      lineHeight: {
        // ── 4 leading values only ──────────────────────────────────────
        'display': '1.15',
        'heading': '1.3',
        'body':    '1.5',
        'relaxed': '1.65',
      },

      letterSpacing: {
        // ── 3 tracking values only ─────────────────────────────────────
        'normal':   '0',
        'tight':    '-0.015em',  // headings ≥18px
        'tighter':  '-0.03em',   // display ≥28px, wordmark
        'wide':     '0.025em',   // badges, labels (rare)
      },

      transitionDuration: {
        'fast':    '120ms',
        'default': '200ms',
        'slow':    '400ms',
      },

      zIndex: {
        'sticky':   '40',   // sticky headers, desktop sidebar
        'overlay':  '50',   // mobile backdrop / slide-over overlay
        'dropdown': '100',  // dropdowns, profile menus
        'modal':    '200',  // settings modal
        'command':  '500',  // command palette
        'progress': '999',  // page-load progress bar (above all overlays)
        'toast':    '9999', // toasts, cookie notice
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
        "fd-spin": {
          to: { transform: "rotate(360deg)" },
        },
        "auth-form-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "cmd-fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "cmd-slide-in": {
          from: { opacity: "0", transform: "translateY(-8px) scale(0.97)" },
          to:   { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        "tooltip-in": {
          from: { opacity: "0", transform: "scale(0.95) translateY(-2px)" },
          to:   { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "fd-toast-in": {
          from: { opacity: "0", transform: "translateX(12px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        "sheet-up": {
          from: { transform: "translateY(100%)" },
          to:   { transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up":   "accordion-up 0.2s ease-out",
        "fd-spin":        "fd-spin 0.7s linear infinite",
        "auth-in":        "auth-form-in 220ms ease both",
        "cmd-fade":       "cmd-fade-in 150ms cubic-bezier(0.22,1,0.36,1) both",
        "cmd-slide":      "cmd-slide-in 150ms cubic-bezier(0.22,1,0.36,1) both",
        "tooltip-in":     "tooltip-in 150ms var(--ease-out) both",
        "toast-in":       "fd-toast-in 200ms cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
