'use client'
import InfoTooltip from '@/components/info-tooltip'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Field, Input, Textarea, Select, Toggle, SaveButton } from '@/components/form-fields'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { Scan, UploadSimple, CircleNotch, Camera } from '@phosphor-icons/react'
import type { Expense } from '@/types/database'

const CATEGORIES = [
  { value: 'office_supplies', label: 'Office & Supplies' },
  { value: 'travel', label: 'Travel & Transport' },
  { value: 'software', label: 'Software & Subscriptions' },
  { value: 'phone_internet', label: 'Phone & Internet' },
  { value: 'professional_fees', label: 'Professional Fees' },
  { value: 'marketing', label: 'Marketing & Advertising' },
  { value: 'equipment', label: 'Equipment & Hardware' },
  { value: 'training', label: 'Training & Development' },
  { value: 'meals', label: 'Meals & Entertainment' },
  { value: 'other', label: 'Other' },
]

interface ExpenseFormProps {
  expense?: Partial<Expense>
  vatRegistered?: boolean
  onSuccess?: () => void
}

export default function ExpenseForm({ expense, vatRegistered, onSuccess }: ExpenseFormProps) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const isEdit = !!expense?.id

  const [form, setForm] = useState({
    date: expense?.date ?? new Date().toISOString().slice(0, 10),
    merchant: expense?.merchant ?? '',
    category: expense?.category ?? 'other',
    description: expense?.description ?? '',
    amount: expense?.amount?.toString() ?? '',
    vat_amount: expense?.vat_amount?.toString() ?? '0',
    vat_reclaimable: expense?.vat_reclaimable ?? (vatRegistered ?? false),
  })
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [isMobile, setIsMobile]         = useState(false)
  const [receiptPreview, setReceiptPreview] = useState<string | null>(expense?.receipt_url ?? null)
  const [scanning, setScanning] = useState(false)
  const [scanConfidence, setScanConfidence] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  function set(field: string, value: string | boolean) {
    setForm(p => ({ ...p, [field]: value }))
    if (typeof value === 'string' && errors[field]) setErrors(p => { const n = { ...p }; delete n[field]; return n })
  }

  // Auto-calc VAT at 20% when amount changes
  function handleAmountChange(val: string) {
    set('amount', val)
    const num = parseFloat(val)
    if (!isNaN(num)) {
      set('vat_amount', (num * 0.2).toFixed(2))
    }
  }

  useEffect(() => {
    setIsMobile(/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent))
  }, [])

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setReceiptFile(file)
    const url = URL.createObjectURL(file)
    setReceiptPreview(url)
  }

  async function handleScanReceipt() {
    if (!receiptFile) {
      fileRef.current?.click()
      return
    }
    setScanning(true)
    setScanConfidence(null)

    const fd = new FormData()
    fd.append('image', receiptFile)

    try {
      const res = await fetch('/api/ai/scan-receipt', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.date) set('date', data.date)
      if (data.merchant) set('merchant', data.merchant)
      if (data.amount_ex_vat) set('amount', data.amount_ex_vat.toString())
      if (data.vat_amount) set('vat_amount', data.vat_amount.toString())
      if (data.category) set('category', data.category)
      if (data.description) set('description', data.description)
      if (data.confidence) setScanConfidence(data.confidence)
    } catch (e) {
      console.error(e)
    }
    setScanning(false)
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!form.date) e.date = 'Date is required'
    if (!form.merchant.trim()) e.merchant = 'Merchant is required'
    if (!form.amount || isNaN(parseFloat(form.amount))) e.amount = 'Valid amount is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let receipt_url = expense?.receipt_url ?? null

    // Upload receipt if new file selected
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop()
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: uploaded } = await supabase.storage.from('receipts').upload(path, receiptFile)
      if (uploaded) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        receipt_url = publicUrl
      }
    }

    const payload = {
      date: form.date,
      merchant: form.merchant,
      category: form.category,
      description: form.description || null,
      amount: parseFloat(form.amount),
      vat_amount: parseFloat(form.vat_amount) || 0,
      vat_reclaimable: form.vat_reclaimable,
      receipt_url,
      ai_scanned: scanConfidence !== null,
      updated_at: new Date().toISOString(),
    }

    const { error } = isEdit
      ? await supabase.from('expenses').update(payload).eq('id', expense!.id!)
      : await supabase.from('expenses').insert({ ...payload, user_id: user.id })

    setSaving(false)
    if (error) { setErrors({ _: error.message }); return }
    onSuccess?.()
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._ && <Alert intent="danger">{errors._}</Alert>}

      {/* Scan receipt button */}
      <Alert intent="info" title="Scan receipt with AI" className="p-4">
        <p className="text-xs text-forest-600 mb-3 -mt-1">Upload a receipt image and AI will auto-fill the fields below.</p>

        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={handleFileSelect} {...(isMobile ? { capture: "environment" as const } : {})} />

        {receiptPreview && receiptFile && (
          <div className="mb-3">
            <img src={receiptPreview} alt="Receipt preview" className="max-h-32 rounded-xl border border-forest-200 object-contain" />
            {scanConfidence && (
              <p className="text-xs mt-1 text-forest-600">
                Scan confidence: <span className="font-medium capitalize">{scanConfidence}</span>
              </p>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button type="button" intent="secondary" size="xs" onClick={() => fileRef.current?.click()}>
            {isMobile ? <Camera weight="regular" className="w-3.5 h-3.5" /> : <UploadSimple weight="regular" className="w-3.5 h-3.5" />}
            {receiptFile ? 'Change image' : isMobile ? 'Take photo' : 'Upload receipt'}
          </Button>
          {receiptFile && (
            <Button type="button" intent="primary" size="xs" onClick={handleScanReceipt} disabled={scanning}>
              {scanning ? <CircleNotch weight="regular" className="w-3.5 h-3.5 animate-spin" /> : <Scan weight="regular" className="w-3.5 h-3.5" />}
              {scanning ? 'Reading receipt...' : 'Scan with AI'}
            </Button>
          )}
        </div>
      </Alert>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" required error={errors.date}>
          <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} error={!!errors.date} />
        </Field>
        <Field label="Category" required>
          <Select value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
        </Field>
      </div>

      <Field label="Merchant / supplier" required error={errors.merchant}>
        <Input value={form.merchant} onChange={e => set('merchant', e.target.value)} placeholder="Amazon, Tesco, etc." error={!!errors.merchant} />
      </Field>

      <Field label="Description">
        <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder="Optional details" />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount ex-VAT (£)" required error={errors.amount}>
          <Input type="number" step="0.01" value={form.amount} onChange={e => handleAmountChange(e.target.value)} placeholder="0.00" error={!!errors.amount} />
        </Field>
        <Field label="VAT amount (£)">
          <Input type="number" step="0.01" value={form.vat_amount} onChange={e => set('vat_amount', e.target.value)} placeholder="0.00" />
        </Field>
      </div>

      <Toggle
        checked={form.vat_reclaimable}
        onChange={val => set('vat_reclaimable', val)}
        label={<span>VAT reclaimable<InfoTooltip>If you are VAT-registered, you can reclaim the VAT on business expenses back from HMRC. Tick this if the expense included VAT and it is a genuine business cost.</InfoTooltip></span>}
      />

      <div className="pt-2">
        <SaveButton loading={saving} label={isEdit ? 'Update expense' : 'Save expense'} />
      </div>
    </form>
  )
}
