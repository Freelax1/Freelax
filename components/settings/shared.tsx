'use client'

import React from 'react'
import Button from '@/components/ui/button'
import { Field, Input, Select, Textarea, inputClass } from '@/components/ui/input'

export { Field, Input, Select, Textarea, inputClass }
export const labelClass = 'block text-xs font-semibold text-text-primary mb-1.5'

export function SaveSettingsButton({
  saving,
  label,
  onClick,
}: {
  saving: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button type="button" intent="primary" size="sm" disabled={saving} onClick={onClick}>
      {saving ? 'Saving...' : label}
    </Button>
  )
}

export const TABS = [
  'Profile',
  'Business details',
  'Personal tax inputs',
  'Invoice Defaults',
  'Quote Defaults',
  'Banking',
  'Notifications',
  'Billing',
  'Accountant Access',
  'HMRC',
  'Danger Zone',
] as const

export type SettingsTab = typeof TABS[number]

export const TAB_GROUPS: { label: string; tabs: SettingsTab[] }[] = [
  {
    label: 'Account',
    tabs:  ['Profile', 'Business details', 'Notifications'],
  },
  {
    label: 'Invoicing',
    tabs:  ['Invoice Defaults', 'Quote Defaults', 'Banking'],
  },
  {
    label: 'Tax & Compliance',
    tabs:  ['Personal tax inputs', 'HMRC'],
  },
  {
    label: 'Plan',
    tabs:  ['Billing', 'Accountant Access'],
  },
  {
    label: 'Advanced',
    tabs:  ['Danger Zone'],
  },
]

export const TAB_DESCRIPTIONS: Record<SettingsTab, string> = {
  'Profile':             'Your name and contact details — shown on invoices and quotes',
  'Business details':    'Business name and type — used in all tax calculations',
  'Notifications':       'Email alerts for invoice activity and payment reminders',
  'Invoice Defaults':    'Prefix, default notes and email templates for new invoices',
  'Quote Defaults':      'Prefix, validity period and email templates for new quotes',
  'Banking':             'Bank details printed on invoices so clients can pay you',
  'Personal tax inputs': 'Tax code, student loan and pension — affects your tax estimate',
  'HMRC':                'Connect your HMRC account for Making Tax Digital submissions',
  'Billing':             'Your current plan, usage and subscription management',
  'Accountant Access':   'Invite your accountant to view your Freelax data read-only',
  'Danger Zone':         'Export all your data or permanently delete your account',
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-brand-primary' : 'bg-border-default'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-surface-card rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  )
}

// Sort code auto-formatter: 123456 → 12-34-56
export function formatSortCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}
