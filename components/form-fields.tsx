/**
 * Re-exports from components/ui/ for backward compatibility.
 * New code should import directly from '@/components/ui'.
 */
export { Field, Input, Textarea, Select, Label } from '@/components/ui/input'
export { default as Button } from '@/components/ui/button'

import { cn } from '@/lib/utils'
import React from 'react'

// ── Toggle ────────────────────────────────────────────────────────────────
// Kept here as it's form-specific and not a general primitive.

interface ToggleProps {
  checked: boolean
  onChange: (val: boolean) => void
  label?: React.ReactNode
}
export function Toggle({ checked, onChange, label }: ToggleProps) {
  return (
    <label className="flex items-center gap-2 cursor-pointer select-none">
      <div
        onClick={() => onChange(!checked)}
        className={cn(
          'relative w-9 h-5 rounded-full transition-colors',
          checked ? 'bg-brand-primary' : 'bg-border-default'
        )}
      >
        <div className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked && 'translate-x-4'
        )} />
      </div>
      {label && <span className="text-sm text-text-primary">{label}</span>}
    </label>
  )
}

// ── SaveButton ─────────────────────────────────────────────────────────────

import Button from '@/components/ui/button'

export function SaveButton({ loading, label = 'Save', className }: { loading?: boolean; label?: string; className?: string }) {
  return (
    <Button type="submit" intent="primary" fullWidth disabled={loading} className={className}>
      {loading ? 'Saving…' : label}
    </Button>
  )
}
