'use client'

// 9-box VAT return form. Three steps managed locally:
//   1. 'form'        — prefilled boxes, user can amend
//   2. 'declaration' — read-only summary + legal declaration checkbox
//   3. 'success'     — confirmation
//
// The periodKey appears only in the URL — it's never rendered.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CircleNotch } from '@phosphor-icons/react'
import { createClient } from '@/lib/supabase/client'
import { fetchPaidInvoicesByUser } from '@/lib/api/invoices'
import { fetchExpensesByUser } from '@/lib/api/expenses'
import { formatCurrency } from '@/lib/tax-calculations'
import PageHeader from '@/components/ui/page-header'
import PageLayout from '@/components/page-layout'
import { PanelCardSkeleton } from '@/components/ui/content-skeletons'
import SectionCard from '@/components/ui/section-card'
import BreakdownRow from '@/components/ui/breakdown-row'
import Alert from '@/components/ui/alert'
import Button, { ButtonLink } from '@/components/ui/button'
import { Field, Input } from '@/components/ui/input'

type Boxes = {
  box1: number
  box2: number
  box3: number
  box4: number
  box5: number
  box6: number
  box7: number
  box8: number
  box9: number
}

type Step = 'form' | 'declaration' | 'success'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function floorWhole(n: number): number {
  return Math.floor(Math.max(0, n))
}

function parseAmount(v: string): number {
  const n = Number(v)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function collectFp() {
  if (typeof window === 'undefined') return {}
  let deviceId = ''
  try {
    deviceId = localStorage.getItem('freelax_device_id') ?? ''
    if (!deviceId) {
      deviceId = crypto.randomUUID()
      localStorage.setItem('freelax_device_id', deviceId)
    }
  } catch {}
  return {
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenWidth:  window.screen.width,
    screenHeight: window.screen.height,
    windowWidth:  window.innerWidth,
    windowHeight: window.innerHeight,
    doNotTrack:   navigator.doNotTrack ?? 'not-set',
    deviceId,
  }
}

export default function VatReturnPage() {
  const params       = useParams<{ periodKey: string }>()
  const searchParams = useSearchParams()
  const periodKey    = decodeURIComponent(params.periodKey)

  const startStr = searchParams.get('start') ?? ''
  const endStr   = searchParams.get('end')   ?? ''
  const dueStr   = searchParams.get('due')   ?? ''

  const periodLabel = useMemo(() => {
    if (!startStr || !endStr) return ''
    const fmt = (iso: string) =>
      new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
      })
    return `${fmt(startStr)} – ${fmt(endStr)}`
  }, [startStr, endStr])

  const [step, setStep]               = useState<Step>('form')
  const [loading, setLoading]         = useState(true)
  const [loadError, setLoadError]     = useState<string | null>(null)
  const [boxes, setBoxes]             = useState<Boxes>({
    box1: 0, box2: 0, box3: 0, box4: 0, box5: 0,
    box6: 0, box7: 0, box8: 0, box9: 0,
  })
  const [declared, setDeclared]       = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const declarationHeadingRef = useRef<HTMLHeadingElement | null>(null)
  const successContainerRef   = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (step === 'declaration') {
      declarationHeadingRef.current?.focus()
    } else if (step === 'success') {
      successContainerRef.current?.focus()
    }
  }, [step])

  // Pre-populate boxes 1, 4, 6, 7 from invoices and expenses in the period.
  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!startStr || !endStr) {
        setLoading(false)
        setLoadError('Missing period dates. Return to the VAT overview and try again.')
        return
      }
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoadError('You need to be signed in to prepare a VAT return.')
          setLoading(false)
          return
        }
        const start = new Date(startStr + 'T00:00:00Z')
        const end   = new Date(endStr   + 'T23:59:59Z')
        const [invoices, expenses] = await Promise.all([
          fetchPaidInvoicesByUser(user.id, start, end),
          fetchExpensesByUser(user.id, start, end),
        ])
        if (cancelled) return

        type InvRow = { total: number; vat_amount: number }
        type ExpRow = { amount: number; vat_amount: number; vat_reclaimable: boolean }
        const invList = (invoices ?? []) as unknown as InvRow[]
        const expList = (expenses ?? []) as unknown as ExpRow[]

        const box1 = round2(invList.reduce((s, i) => s + Number(i.vat_amount ?? 0), 0))
        const totalSalesExVat = invList.reduce(
          (s, i) => s + (Number(i.total ?? 0) - Number(i.vat_amount ?? 0)),
          0,
        )
        const box4 = round2(
          expList
            .filter(e => e.vat_reclaimable)
            .reduce((s, e) => s + Number(e.vat_amount ?? 0), 0),
        )
        const totalPurchasesExVat = expList.reduce(
          (s, e) => s + (Number(e.amount ?? 0) - Number(e.vat_amount ?? 0)),
          0,
        )

        setBoxes({
          box1,
          box2: 0,
          box3: round2(box1),
          box4,
          box5: round2(Math.max(0, box1 - box4)),
          box6: floorWhole(totalSalesExVat),
          box7: floorWhole(totalPurchasesExVat),
          box8: 0,
          box9: 0,
        })
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not load period data.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [startStr, endStr])

  // Keep derived boxes (3, 5) in sync with editable inputs.
  function setBox(key: keyof Boxes, value: number) {
    setBoxes(prev => {
      const next: Boxes = { ...prev, [key]: value }
      next.box3 = round2(next.box1 + next.box2)
      next.box5 = round2(Math.max(0, next.box3 - next.box4))
      return next
    })
  }

  function onBlurWhole(key: keyof Boxes) {
    setBoxes(prev => ({ ...prev, [key]: floorWhole(prev[key]) }))
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSubmitError(null)
    try {
      const res = await fetch('/api/hmrc/vat/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodKey,
          periodStart: startStr,
          periodEnd:   endStr,
          ...boxes,
          declared:    true,
          _fp: collectFp(),
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || json?.error) {
        setSubmitError(json?.error ?? `Submission failed (${res.status}).`)
        setSubmitting(false)
        return
      }
      setStep('success')
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="VAT Return" subtitle={periodLabel || undefined} />
        <div role="status" aria-live="polite">
          <span className="sr-only">Loading VAT return.</span>
          <PanelCardSkeleton className="min-h-[280px]" />
        </div>
      </PageLayout>
    )
  }

  if (loadError) {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="VAT Return" subtitle={periodLabel || undefined} />
        <Alert intent="danger">{loadError}</Alert>
        <ButtonLink href="/tax/vat" intent="secondary" size="sm">
          ← Back to VAT overview
        </ButtonLink>
      </PageLayout>
    )
  }

  if (step === 'success') {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="VAT Return" subtitle={periodLabel || undefined} />
        <div ref={successContainerRef} tabIndex={-1} className="outline-none">
          <Alert intent="success">VAT return submitted successfully.</Alert>
        </div>
        {periodLabel && (
          <p className="text-sm text-text-secondary">
            Period covered: <span className="font-medium text-text-primary">{periodLabel}</span>
            {dueStr && (
              <> · Was due{' '}
                <span className="font-medium text-text-primary">
                  {new Date(dueStr + 'T00:00:00Z').toLocaleDateString('en-GB', {
                    day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
                  })}
                </span>
              </>
            )}
          </p>
        )}
        <ButtonLink href="/tax/vat" intent="secondary" size="sm">
          Back to VAT overview
        </ButtonLink>
      </PageLayout>
    )
  }

  if (step === 'declaration') {
    return (
      <PageLayout className="space-y-6">
        <PageHeader title="VAT Return" subtitle={periodLabel || undefined} />

        <h2
          ref={declarationHeadingRef}
          tabIndex={-1}
          className="sr-only outline-none"
        >
          Review and confirm your VAT return
        </h2>

        <SectionCard title="Summary — please review">
          <BreakdownRow label="Box 1 — VAT due on sales"               value={formatCurrency(boxes.box1)} />
          <BreakdownRow label="Box 2 — VAT due on acquisitions"        value={formatCurrency(boxes.box2)} />
          <BreakdownRow label="Box 3 — Total VAT due"                  value={formatCurrency(boxes.box3)} bold />
          <BreakdownRow label="Box 4 — VAT reclaimed on purchases"     value={formatCurrency(boxes.box4)} />
          <BreakdownRow label="Box 5 — Net VAT to pay"                 value={formatCurrency(boxes.box5)} bold />
          <BreakdownRow label="Box 6 — Total sales ex VAT"             value={formatCurrency(boxes.box6)} />
          <BreakdownRow label="Box 7 — Total purchases ex VAT"         value={formatCurrency(boxes.box7)} />
          <BreakdownRow label="Box 8 — Total EC supplies ex VAT"       value={formatCurrency(boxes.box8)} />
          <BreakdownRow label="Box 9 — Total EC acquisitions ex VAT"   value={formatCurrency(boxes.box9)} />
        </SectionCard>

        <div className="bg-surface-sunken rounded-xl border border-border-default p-4">
          <p id="vat-legal-declaration-text" className="text-sm text-text-primary leading-relaxed">
            When you submit this VAT information you are making a legal declaration that the information is true and complete. A false declaration can result in prosecution.
          </p>
        </div>

        <label className="flex items-start gap-3 text-sm text-text-primary cursor-pointer select-none">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 rounded border-border-default text-brand-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-strong"
            checked={declared}
            onChange={e => setDeclared(e.target.checked)}
            aria-required="true"
            aria-describedby="vat-legal-declaration-text"
          />
          <span>I confirm this declaration is true and complete</span>
        </label>

        <div role="alert" aria-live="assertive" aria-atomic="true">
          {submitError && <Alert intent="danger">{submitError}</Alert>}
        </div>

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button
            type="button"
            intent="ghost"
            size="sm"
            onClick={() => { setStep('form'); setSubmitError(null) }}
            disabled={submitting}
            className="underline"
          >
            Go back
          </Button>
          <Button
            type="button"
            intent="primary"
            size="md"
            onClick={() => {
              if (!declared || submitting) return
              handleSubmit()
            }}
            aria-disabled={!declared || submitting}
            aria-describedby="vat-legal-declaration-text"
            className={(!declared || submitting) ? 'opacity-50 cursor-not-allowed' : undefined}
          >
            {submitting && (
              <span role="status" className="inline-flex items-center">
                <CircleNotch weight="regular" className="w-4 h-4 animate-spin" aria-hidden="true" />
                <span className="sr-only">Submitting</span>
              </span>
            )}
            {submitting ? 'Submitting…' : 'Submit to HMRC'}
          </Button>
        </div>
      </PageLayout>
    )
  }

  // ── Step: 'form' ──
  return (
    <PageLayout className="space-y-6">
      <PageHeader title="VAT Return" subtitle={periodLabel || undefined} />

      <SectionCard title="VAT return — 9 boxes">
        <div className="py-3 space-y-4">
          <BoxField
            label="Box 1 — VAT due on sales"
            hint="Pre-filled from VAT on paid invoices in the period."
            value={boxes.box1}
            step="0.01"
            onChange={v => setBox('box1', parseAmount(v))}
          />
          <BoxField
            label="Box 2 — VAT due on acquisitions"
            hint="VAT due on goods acquired from other EU member states."
            value={boxes.box2}
            step="0.01"
            onChange={v => setBox('box2', parseAmount(v))}
          />
          <BoxField
            label="Box 3 — Total VAT due"
            hint="Box 1 + Box 2 (calculated)."
            value={boxes.box3}
            readOnly
          />
          <BoxField
            label="Box 4 — VAT reclaimed on purchases"
            hint="Pre-filled from reclaimable VAT on expenses in the period."
            value={boxes.box4}
            step="0.01"
            onChange={v => setBox('box4', parseAmount(v))}
          />
          <BoxField
            label="Box 5 — Net VAT to pay"
            hint="Box 3 − Box 4, minimum £0.00 (calculated)."
            value={boxes.box5}
            readOnly
          />
          <BoxField
            label="Box 6 — Total value of sales excluding VAT"
            hint="Whole pounds only."
            value={boxes.box6}
            step="1"
            integer
            onChange={v => setBox('box6', parseAmount(v))}
            onBlur={() => onBlurWhole('box6')}
          />
          <BoxField
            label="Box 7 — Total value of purchases excluding VAT"
            hint="Whole pounds only."
            value={boxes.box7}
            step="1"
            integer
            onChange={v => setBox('box7', parseAmount(v))}
            onBlur={() => onBlurWhole('box7')}
          />
          <BoxField
            label="Box 8 — Total value of EC supplies"
            hint="Whole pounds only."
            value={boxes.box8}
            step="1"
            integer
            onChange={v => setBox('box8', parseAmount(v))}
            onBlur={() => onBlurWhole('box8')}
          />
          <BoxField
            label="Box 9 — Total value of EC acquisitions"
            hint="Whole pounds only."
            value={boxes.box9}
            step="1"
            integer
            onChange={v => setBox('box9', parseAmount(v))}
            onBlur={() => onBlurWhole('box9')}
          />
        </div>
      </SectionCard>

      <div className="flex items-center justify-between gap-3">
        <Link
          href="/tax/vat"
          className="text-sm text-text-secondary hover:text-text-primary underline"
        >
          Cancel
        </Link>
        <Button
          type="button"
          intent="primary"
          size="md"
          onClick={() => setStep('declaration')}
        >
          Review and submit
        </Button>
      </div>
    </PageLayout>
  )
}

// ── Box field ────────────────────────────────────────────────────────────────
// Thin wrapper around Field + Input so each box is laid out consistently.
// readOnly boxes are visually distinct (greyed) but still keyboard-focusable.

function BoxField({
  label, hint, value, step, integer, readOnly,
  onChange, onBlur,
}: {
  label:    string
  hint?:    string
  value:    number
  step?:    string
  integer?: boolean
  readOnly?: boolean
  onChange?: (v: string) => void
  onBlur?:   () => void
}) {
  const displayed = readOnly
    ? value.toFixed(2)
    : integer
      ? String(Math.floor(value))
      : String(value)

  return (
    <Field label={label} hint={hint}>
      <Input
        type="number"
        inputMode={integer ? 'numeric' : 'decimal'}
        min={0}
        step={step ?? 'any'}
        value={displayed}
        readOnly={readOnly}
        onChange={readOnly ? undefined : e => onChange?.(e.target.value)}
        onBlur={readOnly ? undefined : onBlur}
        className={readOnly ? 'bg-surface-sunken cursor-not-allowed text-text-secondary' : undefined}
      />
    </Field>
  )
}
