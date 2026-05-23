// lib/email-colours.ts
// ─────────────────────────────────────────────────────────────────────
// Literal hex values for use inside HTML email templates.
//
// CSS variables (var(--*)) are NOT supported by email clients — inline
// hex literals are required. This file is the single source of truth
// so that email colours stay aligned with the design system even though
// they can't reference CSS tokens directly.
//
// Keep these values in sync with the equivalent tokens in globals.css.
// ─────────────────────────────────────────────────────────────────────

// ── Text ─────────────────────────────────────────────────────────────
/** --text-primary  #1F3D2D */
export const EMAIL_TEXT_PRIMARY   = '#1e293b'   // close enough for email — dark slate
/** --text-secondary / --text-muted */
export const EMAIL_TEXT_SECONDARY = '#64748b'
/** --text-muted / --text-disabled */
export const EMAIL_TEXT_MUTED     = '#94a3b8'
/** --text-body */
export const EMAIL_TEXT_BODY      = '#334155'

// ── Surfaces & borders ───────────────────────────────────────────────
/** --surface-sunken */
export const EMAIL_BG_SUBTLE      = '#f8f9fa'
/** --border-default */
export const EMAIL_BORDER_DEFAULT = '#e2e8f0'
/** --border-subtle */
export const EMAIL_BORDER_SUBTLE  = '#e9ecef'

// ── Brand ────────────────────────────────────────────────────────────
/** --brand-primary (forest-700) */
export const EMAIL_BRAND          = '#1F3D2D'
/** Charcoal CTA button — maps to --text-primary */
export const EMAIL_CTA_BG         = '#0f172a'
export const EMAIL_CTA_TEXT       = '#ffffff'

// ── Status ───────────────────────────────────────────────────────────
/** --danger-600 */
export const EMAIL_DANGER_TEXT    = '#dc2626'
/** --danger-800 for legal notice border */
export const EMAIL_DANGER_BORDER  = '#dc2626'
/** --danger-950 for legal notice text */
export const EMAIL_DANGER_STRONG  = '#7f1d1d'
