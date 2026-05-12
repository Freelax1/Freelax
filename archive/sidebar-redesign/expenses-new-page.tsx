'use client'

// app/(dashboard)/expenses/new/page.tsx — visual refresh
// UI only. Data via lib/api/expenses + lib/api/users. No inline Supabase.

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchCurrentUser } from '@/lib/api/users'
import { createExpense, uploadReceipt } from '@/lib/api/expenses'
import { Field, Input, Select, Toggle, SaveButton } from '@/components/form-fields'
import { ScanLine, Upload, Loader2, ArrowLeft, Sparkles, X, FileText } from 'lucide-react'
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
  const [scanCooldown, setScanCooldown]     = useState(false)
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

  function clearReceipt() {
    setReceiptFile(null)
    setReceiptPreview(null)
    setScanConfidence(null)
    if (fileRef.current) fileRef.current.value = ''
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
    setScanCooldown(true)
    setTimeout(() => setScanCooldown(false), 15000)
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
    <div className="fd-page-enter" style={{ maxWidth: 720, margin: '0 auto', paddingBottom: 48 }}>
      {/* Back link + heading */}
      <div style={{ marginBottom: 22 }}>
        <Link
          href="/expenses"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12.5, color: 'var(--ct-ink-3)',
            textDecoration: 'none', fontWeight: 500,
            marginBottom: 10, letterSpacing: '-0.005em',
          }}
        >
          <ArrowLeft style={{ width: 13, height: 13 }} strokeWidth={1.75} />
          Back to expenses
        </Link>
        <h1 className="ct-h1">New expense</h1>
        <p className="ct-h1-sub">Log a business cost — every entry reduces your tax bill.</p>
      </div>

      {error && (
        <div className="ct-panel" style={{
          background: 'var(--ct-danger-soft)',
          borderColor: 'var(--ct-danger-line)',
          padding: '11px 14px',
          marginBottom: 16,
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <X style={{ width: 14, height: 14, color: 'var(--ct-danger)', marginTop: 2, flexShrink: 0 }} strokeWidth={2} />
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ct-ink)', lineHeight: 1.5 }}>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── AI receipt scanner card ─────────────────────────── */}
        <div className="ct-panel" style={{
          position: 'relative',
          background:
            'radial-gradient(70% 80% at 100% 0%, rgba(31,79,138,0.10), transparent 60%), linear-gradient(180deg, #F4F7FB 0%, #EEF3F9 100%)',
          borderColor: 'var(--ct-info-line)',
          paddingLeft: 24,
          overflow: 'hidden',
        }}>
          <span aria-hidden style={{
            position: 'absolute', left: 0, top: 16, bottom: 16, width: 3,
            background: 'var(--ct-info)',
            borderRadius: '0 3px 3px 0',
            boxShadow: '0 0 12px rgba(31,79,138,0.45)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{
              width: 24, height: 24, borderRadius: 7,
              display: 'grid', placeItems: 'center',
              background: 'rgba(31,79,138,0.12)',
              border: '1px solid var(--ct-info-line)',
              color: 'var(--ct-info)',
            }}>
              <Sparkles style={{ width: 12, height: 12 }} strokeWidth={2} />
            </span>
            <h2 style={{
              margin: 0, fontSize: 13, fontWeight: 700,
              color: 'var(--ct-info)',
              textTransform: 'uppercase', letterSpacing: '0.10em',
            }}>
              Scan receipt with AI
            </h2>
          </div>
          <p style={{
            margin: '0 0 14px', fontSize: 12.5, color: 'var(--ct-ink-2)',
            lineHeight: 1.5, letterSpacing: '-0.005em',
          }}>
            Upload a receipt image and we&rsquo;ll auto-fill merchant, amount, VAT and category.
          </p>

          <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleFileSelect} />

          {receiptPreview && receiptFile && (
            <div style={{
              marginBottom: 12,
              display: 'flex', alignItems: 'flex-start', gap: 12,
              background: 'var(--ct-surface)',
              border: '1px solid var(--ct-info-line)',
              borderRadius: 'var(--ct-r-md)',
              padding: 10,
            }}>
              <div style={{
                width: 72, height: 72, flexShrink: 0,
                borderRadius: 8, overflow: 'hidden',
                background: 'var(--ct-bg-2)',
                border: '1px solid var(--ct-line)',
              }}>
                {receiptFile.type.startsWith('image/') ? (
                  <img src={receiptPreview} alt="Receipt preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: 'var(--ct-ink-3)' }}>
                    <FileText style={{ width: 22, height: 22 }} strokeWidth={1.5} />
                  </div>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  margin: 0, fontSize: 12.5, fontWeight: 600, color: 'var(--ct-ink)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  letterSpacing: '-0.005em',
                }}>
                  {receiptFile.name}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ct-ink-3)' }}>
                  {(receiptFile.size / 1024).toFixed(1)} KB
                </p>
                {scanConfidence && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--ct-info)', fontWeight: 600 }}>
                    Scan confidence: <span style={{ textTransform: 'capitalize' }}>{scanConfidence}</span>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={clearReceipt}
                className="ct-iconbtn"
                style={{ width: 26, height: 26, flexShrink: 0 }}
                aria-label="Remove receipt"
                title="Remove"
              >
                <X style={{ width: 12, height: 12 }} strokeWidth={2} />
              </button>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => fileRef.current?.click()} className="ct-btn">
              <Upload style={{ width: 13, height: 13 }} strokeWidth={2} />
              <span>{receiptFile ? 'Change image' : 'Upload receipt'}</span>
            </button>
            {receiptFile && (
              <button
                type="button"
                onClick={handleScanReceipt}
                disabled={scanning || scanCooldown}
                className="ct-btn"
                style={{
                  background: 'var(--ct-info)',
                  color: '#fff',
                  borderColor: 'var(--ct-info)',
                  opacity: (scanning || scanCooldown) ? 0.6 : 1,
                }}
              >
                {scanning
                  ? <Loader2 style={{ width: 13, height: 13 }} strokeWidth={2} className="ct-spin" />
                  : <ScanLine style={{ width: 13, height: 13 }} strokeWidth={2} />}
                <span>{scanning ? 'Reading receipt…' : 'Scan with AI'}</span>
              </button>
            )}
          </div>
          <style>{`@keyframes ct-spin { to { transform: rotate(360deg); } } .ct-spin { animation: ct-spin 800ms linear infinite; }`}</style>
        </div>

        {/* ── Main fields card ────────────────────────────────── */}
        <div className="ct-panel" style={{ padding: 22 }}>
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ct-ink)', letterSpacing: '-0.005em' }}>
              Expense details
            </h2>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ct-ink-3)' }}>
              Required fields are marked with an asterisk.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="fd-form-grid">
            <Field label="Date" required error={errors.date}>
              <Input type="date" value={form.date} onChange={e => set('date', e.target.value)} error={!!errors.date} />
            </Field>
            <Field label="Category">
              <Select value={form.category} onChange={e => set('category', e.target.value)} options={CATEGORIES} />
            </Field>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Field label="Merchant / supplier" required error={errors.merchant}>
              <Input
                value={form.merchant}
                onChange={e => set('merchant', e.target.value)}
                placeholder="Amazon, Tesco, etc."
                error={!!errors.merchant}
              />
            </Field>
          </div>

          <div style={{ marginBottom: 14 }}>
            <Field label="Description">
              <Input
                value={form.description}
                onChange={e => set('description', e.target.value)}
                placeholder="Optional details"
              />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }} className="fd-form-grid">
            <Field label="Amount ex-VAT (£)" required error={errors.amount}>
              <Input
                type="number" step="0.01"
                value={form.amount}
                onChange={e => handleAmountChange(e.target.value)}
                placeholder="0.00"
                error={!!errors.amount}
              />
            </Field>
            <Field label="VAT amount (£)">
              <Input
                type="number" step="0.01"
                value={form.vat_amount}
                onChange={e => set('vat_amount', e.target.value)}
                placeholder="0.00"
              />
            </Field>
          </div>

          <div style={{
            padding: '12px 14px',
            background: 'var(--ct-bg-2)',
            border: '1px solid var(--ct-line)',
            borderRadius: 'var(--ct-r-sm)',
          }}>
            <Toggle
              checked={form.vat_reclaimable}
              onChange={val => set('vat_reclaimable', val)}
              label="VAT reclaimable"
            />
            <p style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--ct-ink-3)', lineHeight: 1.45 }}>
              Toggle on if this VAT amount can be reclaimed from HMRC. Only applies if you&rsquo;re VAT registered.
            </p>
          </div>
        </div>

        {/* ── Footer actions ──────────────────────────────────── */}
        <div className="fd-action-bar" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <Link href="/expenses" className="ct-btn">
            Cancel
          </Link>
          <SaveButton loading={saving} label="Save expense" />
        </div>
      </form>

      <style>{`
        @media (max-width: 640px) {
          .fd-form-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
