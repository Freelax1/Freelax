// lib/status-palette.ts
// ─────────────────────────────────────────────────────────────────────
// Single source of truth for status-badge / status-card colours.
// Every dashboard page that renders status pills, summary cards, dots
// or filter chips should look up its palette here instead of defining
// inline hex values.
//
// Tones map onto the CSS token ramps in app/globals.css:
//   success → --success-*    (paid, active, accepted)
//   info    → --info-*       (sent, completed)
//   warning → --warning-*    (paused, on_hold)
//   danger  → --danger-*     (overdue, cancelled, declined, expired)
//   neutral → semantic text/surface tokens (draft, archived)
//
// The exported CSS-var strings are safe to use directly as inline
// `style={{ color: tone.text, background: tone.bg }}` values.
// ─────────────────────────────────────────────────────────────────────

export type StatusTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral'

export interface StatusToneColours {
  /** Small saturated dot — used in legend dots and inside filter chips. */
  dot: string
  /** Label text on a tinted bg — e.g. "Paid" inside a success-50 pill. */
  text: string
  /** Strong value text — counts, totals on the summary card. */
  textValue: string
  /** Tinted surface background — pills, summary cards. */
  bg: string
  /** Slightly deeper tint for hover states on cards. */
  hover: string
  /** Border for the tinted surface. */
  border: string
}

export const STATUS_TONES: Record<StatusTone, StatusToneColours> = {
  success: {
    dot:       'var(--success-500)',
    text:      'var(--success-600)',
    textValue: 'var(--success-600)',
    bg:        'var(--success-50)',
    hover:     'var(--success-100)',
    border:    'var(--success-200)',
  },
  info: {
    dot:       'var(--info-500)',
    text:      'var(--info-600)',
    textValue: 'var(--info-600)',
    bg:        'var(--info-50)',
    hover:     'var(--info-100)',
    border:    'var(--info-200)',
  },
  warning: {
    dot:       'var(--warning-500)',
    text:      'var(--warning-600)',
    textValue: 'var(--warning-600)',
    bg:        'var(--warning-50)',
    hover:     'var(--warning-100)',
    border:    'var(--warning-200)',
  },
  danger: {
    dot:       'var(--danger-500)',
    text:      'var(--danger-600)',
    textValue: 'var(--danger-600)',
    bg:        'var(--danger-50)',
    hover:     'var(--danger-100)',
    border:    'var(--danger-200)',
  },
  neutral: {
    dot:       'var(--text-disabled)',
    text:      'var(--text-secondary)',
    textValue: 'var(--text-primary)',
    bg:        'var(--surface-sunken)',
    hover:     'var(--border-subtle)',
    border:    'var(--border-default)',
  },
}

/**
 * Maps a status string (from any of invoices/quotes/projects/clients) to
 * its semantic tone. Extend here when new statuses are added — don't add
 * inline lookups in feature code.
 */
export const STATUS_TONE_MAP: Record<string, StatusTone> = {
  // ── success ──────────────────────────────────────────────────────
  paid:      'success',
  active:    'success',
  accepted:  'success',

  // ── info ─────────────────────────────────────────────────────────
  sent:      'info',
  completed: 'info',

  // ── warning ──────────────────────────────────────────────────────
  paused:    'warning',
  on_hold:   'warning',

  // ── danger ───────────────────────────────────────────────────────
  overdue:   'danger',
  cancelled: 'danger',
  declined:  'danger',
  expired:   'danger',

  // ── neutral ──────────────────────────────────────────────────────
  draft:     'neutral',
  archived:  'neutral',
}

/** Returns the tone name for a status string. Falls back to 'neutral'. */
export const toneFor = (status: string | null | undefined): StatusTone =>
  (status ? STATUS_TONE_MAP[status] : undefined) ?? 'neutral'

/** Convenience: returns the full colour record for a status string. */
export const tonePalette = (status: string | null | undefined): StatusToneColours =>
  STATUS_TONES[toneFor(status)]
