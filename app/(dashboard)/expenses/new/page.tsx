'use client'

// app/(dashboard)/expenses/new/page.tsx — v1.1
// UI only. Data via lib/api/expenses + lib/api/users. No inline Supabase.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCurrentUser } from '@/lib/api/users'
import { createExpense, uploadReceipt } from '@/lib/api/expenses'
import { Field, Input, Select, Toggle, SaveButton } from '@/components/form-fields'
import { ScanLine, Upload, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  { value: 'office_supplies',   label: 'Office & Supplies' },
  { value: 'travel',            label: 'Travel & Transport' },
  { value: 'software',          label: 'Software & Subscriptions' },
  { value: 'phone_internet',    label: 'Phone & Internet' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'marketing',         label: 'Marketing & Advertising' },
  { value: 'equipment',         label: 'Equipment & Hardware' },
  { value: 'training',          label: 'Training & Development' },
  { value: 'meals',             label: 'Meals & Entertainment' },
  { value: 'other',             label: 'Other' },
]

export default function NewExpensePage() {
  const router  = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    date:            new Date().toISOString().slice(0, 10),
    merchant:        '',
    category:        'other',
    description:     '',
    amount:          '',
    vat_amount:      '0',
    vat_reclaimable: false,
  })
  const [receiptFile, setReceiptFile]       = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null)
  const [scanning, setScanning]             = useState(false)
  const [scanConfidence, setScanConfidence] = useState<string | null>(null)
  const [errors, setErrors]                 = useState<Record<string, string>>({})
  const [saving, setSaving]                 = useState(false)
  const [error, setError]                   = useState<string | null>(null)

  function set(field: string, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }))
    if (typeof value === 'string' && errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n })
  }

  function handleAmountChange(val: string) {
    set('amount', val)
    const num = parseFloat(val)
    if (!isNaN(num)) set('vat_amount', (num * 0.2).toFixed(2))
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    setReceiptPreview(URL.createObjectURL(file))
  }

  async function handleScanReceipt() {
    if (!receiptFile) { fileRef.current?.click(); return }
    setScanning(true)
    setScanConfidence(null)
    try {
      const fd = new FormData()
      fd.append('image', receiptFile)
      const res  = await fetch('/api/ai/scan-receipt', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.date)          set('date',        data.date)
      if (data.merchant)      set('merchant',    data.merchant)
      if (data.amount_ex_vat) set('amount',      data.amount_ex_vat.toString())
      if (data.vat_amount)    set('vat_amount',  data.vat_amount.toString())
      if (data.category)      set('category',    data.category)
      if (data.description)   set('description', data.description)
      if (data.confidence)    setScanConfidence(data.confidence)
    } catch {}
    setScanning(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.date)                                      e.date     = 'Date is required'
    if (!form.merchant.trim())                           e.merchant = 'Merchant is required'
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount   = 'Valid amount is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    setError(null)

    try {
      const user = await fetchCurrentUser()
      if (!user) return

      // Upload receipt via API layer if provided
      const receipt_url = receiptFile ? await uploadReceipt(user.id, receiptFile) : null

      await createExpense({
        user_id:         user.id,
        date:            form.date,
        merchant:        form.merchant,
        category:        form.category,
        description:     form.description || null,
        amount:          parseFloat(form.amount),
        vat_amount:      parseFloat(form.vat_amount) || 0,
        vat_reclaimable: form.vat_reclaimable,
        receipt_url,
        ai_scanned:      scanConfidence !== null,
        updated_at:      new Date().toISOString(),
      })

      router.push('/expenses')
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div>
        <Link href="/expenses" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-3">
          <ArrowLeft className="w-4 h-4" /> Back to expenses
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New expense</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">

        {/* AI receipt scanner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-blue-800 mb-1">📷 Scan receipt with AI</p>
          <p className="text-xs text-blue-600 mb-4">Upload a receipt image and AI will auto-fill the fields below.</p>

          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} />

          {receiptPreview && receiptFile && (
            <div className="mb-4">
              <img src={receiptPreview} alt="Receipt preview" className="max-h-36 rounded-lg border border-blue-200 object-contain" />
              {scanConfidence && (
                <p className="text-xs mt-1.5 text-blue-600">
                  Scan confidence: <span className="font-medium capitalize">{scanConfidence}</span>
                </p>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 border border-blue-300 bg-white text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50">
              <Upload className="w-3.5 h-3.5" />
              {receiptFile ? 'Change image' : 'Upload receipt'}
            </button>
            {receiptFile && (
              <button type="button" onClick={handleScanReceipt} disabled={scanning}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {scanning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanLine className="w-3.5 h-3.5" />}
                {scanning ? 'Reading receipt...' : 'Scan with AI'}
              </button>
            )}
          </div>
        </div>

        {/* Main fields */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-semibold text-slate-800">Expense details</h2>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" required error={errors.date}>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} error={!!errors.date} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
            </Field>
          </div>

          <Field label="Merchant / supplier" required error={errors.merchant}>
            <Input value={form.merchant} onChange={e => set('merchant', e.target.value)}
              placeholder="Amazon, Tesco, etc." error={!!errors.merchant} />
          </Field>

          <Field label="Description">
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Amount ex-VAT (£)" required error={errors.amount}>
              <Input type="number" step="0.01" value={form.amount}
                onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" error={!!errors.amount} />
            </Field>
            <Field label="VAT amount (£)">
              <Input type="number" step="0.01" value={form.vat_amount}
                onChange={e => set('vat_amount', e.target.value)} placeholder="0.00" />
            </Field>
          </div>

          <Toggle checked={form.vat_reclaimable} onChange={val => set('vat_reclaimable', val)} label="VAT reclaimable" />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/expenses" className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">
            Cancel
          </Link>
          <SaveButton loading={saving} label="Save expense" />
        </div>
      </form>
    </div>
  )
}
