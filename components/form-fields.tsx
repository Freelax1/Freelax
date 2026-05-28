import React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps {
  label: React.ReactNode
  required?: boolean
  error?: string
  children: React.ReactNode
  className?: string
}

export function Field({ label, required, error, children, className }: FieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <div className="block text-sm font-medium text-slate-700">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </div>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50 disabled:text-slate-400'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}
export function Input({ error, className, ...props }: InputProps) {
  return <input className={cn(inputClass, error && 'border-red-300 focus:ring-red-500', className)} {...props} />
}

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}
export function Textarea({ error, className, ...props }: TextareaProps) {
  return <textarea className={cn(inputClass, 'resize-none', error && 'border-red-300 focus:ring-red-500', className)} {...props} />
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean
  options: { value: string; label: string }[]
}
export function Select({ error, options, className, ...props }: SelectProps) {
  return (
    <select className={cn(inputClass, error && 'border-red-300 focus:ring-red-500', className)} {...props}>
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
}

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
          checked ? 'bg-blue-600' : 'bg-slate-200'
        )}
      >
        <div className={cn(
          'absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform',
          checked && 'translate-x-4'
        )} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  )
}

export function SaveButton({ loading, label = 'Save', className }: { loading?: boolean; label?: string; className?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className={cn('w-full bg-slate-900 text-white py-2.5 px-4 rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors', className)}
    >
      {loading ? 'Saving...' : label}
    </button>
  )
}
