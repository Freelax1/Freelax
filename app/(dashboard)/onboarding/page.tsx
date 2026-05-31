'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ArrowLeft } from '@phosphor-icons/react'
import Button from '@/components/ui/button'
import Alert from '@/components/ui/alert'
import { Field, Input, Select, Toggle } from '@/components/form-fields'
import { stepTitle } from '@/lib/typography'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, label: 'About you' },
  { id: 2, label: 'Business details' },
  { id: 3, label: 'Your address' },
  { id: 4, label: 'Tax inputs (optional)' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [step1, setStep1] = useState({ full_name: '', phone: '' })
  const [step2, setStep2] = useState({
    business_name: '',
    business_type: 'sole_trader',
    utr_number: '',
    vat_registered: false,
    vat_number: '',
  })
  const [step3, setStep3] = useState({
    address_line1: '',
    address_line2: '',
    city: '',
    postcode: '',
  })

  const [step4, setStep4] = useState({
    student_loan_plan:         'none',
    pension_contributions:     '',
    salary_drawn:              '',
    dividends_drawn:           '',
    monthly_personal_outgoings:  '',
  })

  async function finish() {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setSaving(false); return }

    const { error: err } = await supabase.from('users').update({
      ...step1,
      ...step2,
      ...step3,
      student_loan_plan:         step4.student_loan_plan !== 'none' ? step4.student_loan_plan : null,
      pension_contributions:     step4.pension_contributions ? Number(step4.pension_contributions) : null,
      salary_drawn:              step4.salary_drawn ? Number(step4.salary_drawn) : null,
      dividends_drawn:           step4.dividends_drawn ? Number(step4.dividends_drawn) : null,
      monthly_personal_outgoings:  step4.monthly_personal_outgoings  ? Number(step4.monthly_personal_outgoings)  : null,
      updated_at:                new Date().toISOString(),
    }).eq('id', user.id)

    if (err) { console.error('Onboarding update failed:', err); setError(err.message); setSaving(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-surface-sunken flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-serif font-normal text-text-primary tracking-tighter">
            Freelax
          </span>
          <p className="text-sm text-text-secondary mt-1">Let's get you set up — takes about 2 minutes</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 transition-colors ${
                step > s.id
                  ? 'bg-brand-primary text-white'
                  : step === s.id
                  ? 'bg-brand-primary text-white ring-4 ring-surface-sunken'
                  : 'bg-surface-sunken text-text-secondary'
              }`}>
                {step > s.id ? <Check weight="regular" className="w-3.5 h-3.5" /> : s.id}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-xs font-medium ${step >= s.id ? 'text-text-primary' : 'text-text-secondary'}`}>{s.label}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 bg-surface-sunken rounded">
                  <div
                    className="h-full bg-brand-primary rounded transition-all duration-300"
                    style={{ width: step > s.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-surface-card rounded-xl border border-border-default p-8 shadow-sm">
          {error && (
            <Alert intent="danger" className="mb-5">
              {error}
            </Alert>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className={cn('text-xl', stepTitle)}>Tell us about yourself</h2>
                <p className="text-sm text-text-secondary mt-1">This appears on your invoices and account.</p>
              </div>
              <Field label="Full name" required>
                <Input
                  placeholder="Jane Smith"
                  value={step1.full_name}
                  onChange={e => setStep1(p => ({ ...p, full_name: e.target.value }))}
                  autoFocus
                />
              </Field>
              <Field label={<>Phone number <span className="text-text-secondary font-normal normal-case">(optional)</span></>}>
                <Input
                  placeholder="07700 000000"
                  value={step1.phone}
                  onChange={e => setStep1(p => ({ ...p, phone: e.target.value }))}
                />
              </Field>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className={cn('text-xl', stepTitle)}>Your business</h2>
                <p className="text-sm text-text-secondary mt-1">Used for tax calculations and invoices.</p>
              </div>
              <Field label={<>Trading name <span className="text-text-secondary font-normal normal-case">(optional)</span></>}>
                <Input
                  placeholder="Jane Smith Creative"
                  value={step2.business_name}
                  onChange={e => setStep2(p => ({ ...p, business_name: e.target.value }))}
                  autoFocus
                />
              </Field>
              <Field label="Business type">
                <Select
                  value={step2.business_type}
                  onChange={e => setStep2(p => ({ ...p, business_type: e.target.value }))}
                >
                  <option value="sole_trader">Sole Trader</option>
                  <option value="limited_company">Limited Company</option>
                  <option value="partnership">Partnership</option>
                </Select>
              </Field>
              <Field label={<>UTR number <span className="text-text-secondary font-normal normal-case">(optional — for Self Assessment)</span></>}>
                <Input
                  placeholder="1234567890"
                  value={step2.utr_number}
                  onChange={e => setStep2(p => ({ ...p, utr_number: e.target.value }))}
                />
              </Field>
              <div>
                <Toggle
                  checked={step2.vat_registered}
                  onChange={vat_registered => setStep2(p => ({ ...p, vat_registered }))}
                  label="VAT registered"
                />
                {step2.vat_registered && (
                  <Field label="VAT number" className="mt-3">
                    <Input
                      placeholder="GB123456789"
                      value={step2.vat_number}
                      onChange={e => setStep2(p => ({ ...p, vat_number: e.target.value }))}
                    />
                  </Field>
                )}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className={cn('text-xl', stepTitle)}>Your address</h2>
                <p className="text-sm text-text-secondary mt-1">Appears on invoices you send to clients.</p>
              </div>
              <Field label="Address line 1">
                <Input
                  placeholder="10 Downing Street"
                  value={step3.address_line1}
                  onChange={e => setStep3(p => ({ ...p, address_line1: e.target.value }))}
                  autoFocus
                />
              </Field>
              <Field label={<>Address line 2 <span className="text-text-secondary font-normal normal-case">(optional)</span></>}>
                <Input
                  value={step3.address_line2}
                  onChange={e => setStep3(p => ({ ...p, address_line2: e.target.value }))}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="City">
                  <Input
                    placeholder="London"
                    value={step3.city}
                    onChange={e => setStep3(p => ({ ...p, city: e.target.value }))}
                  />
                </Field>
                <Field label="Postcode">
                  <Input
                    placeholder="SW1A 2AA"
                    value={step3.postcode}
                    onChange={e => setStep3(p => ({ ...p, postcode: e.target.value }))}
                  />
                </Field>
              </div>

              {/* Summary recap */}
              <div className="bg-surface-sunken rounded-xl p-4 text-sm space-y-1.5 border border-border-subtle">
                <p className="font-medium text-text-primary mb-2 text-xs">Summary</p>
                <div className="flex justify-between"><span className="text-text-secondary">Name</span><span className="font-medium">{step1.full_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Business</span><span className="font-medium">{step2.business_name || step1.full_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">Type</span><span className="font-medium capitalize">{step2.business_type.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-text-secondary">VAT</span><span className="font-medium">{step2.vat_registered ? step2.vat_number || 'Registered' : 'Not registered'}</span></div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className={cn('text-xl', stepTitle)}>Personal tax inputs</h2>
                <p className="text-sm text-text-secondary mt-1">Improves the accuracy of your tax estimates. You can skip and set these later in Settings.</p>
              </div>

              <Field
                label={<>Typical monthly personal outgoings <span className="text-text-secondary font-normal normal-case">(£, optional but recommended)</span></>}
                hint="Rent or mortgage, food, bills, subscriptions — the fixed cost of your life each month. We use this to show what's genuinely safe to spend."
              >
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 2500"
                  value={step4.monthly_personal_outgoings}
                  onChange={e => setStep4(p => ({ ...p, monthly_personal_outgoings: e.target.value }))}
                />
              </Field>

              <Field label="Student loan plan">
                <Select
                  value={step4.student_loan_plan}
                  onChange={e => setStep4(p => ({ ...p, student_loan_plan: e.target.value }))}
                >
                  <option value="none">None</option>
                  <option value="plan1">Plan 1</option>
                  <option value="plan2">Plan 2</option>
                  <option value="plan4">Plan 4 (Scotland)</option>
                  <option value="plan5">Plan 5</option>
                  <option value="postgrad">Postgraduate loan</option>
                </Select>
              </Field>

              <Field label={<>Annual pension contributions <span className="text-text-secondary font-normal normal-case">(£, optional)</span></>}>
                <Input
                  type="number"
                  min="0"
                  placeholder="e.g. 3000"
                  value={step4.pension_contributions}
                  onChange={e => setStep4(p => ({ ...p, pension_contributions: e.target.value }))}
                />
              </Field>

              {step2.business_type === 'limited_company' && (
                <>
                  <Field label={<>Salary drawn from company <span className="text-text-secondary font-normal normal-case">(£ per year, optional)</span></>}>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 12570"
                      value={step4.salary_drawn}
                      onChange={e => setStep4(p => ({ ...p, salary_drawn: e.target.value }))}
                    />
                  </Field>
                  <Field label={<>Dividends drawn from company <span className="text-text-secondary font-normal normal-case">(£ per year, optional)</span></>}>
                    <Input
                      type="number"
                      min="0"
                      placeholder="e.g. 40000"
                      value={step4.dividends_drawn}
                      onChange={e => setStep4(p => ({ ...p, dividends_drawn: e.target.value }))}
                    />
                  </Field>
                </>
              )}
              <p className="text-xs text-text-secondary">These figures affect tax estimates only and are never shared.</p>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <Button type="button" intent="outline" size="sm" onClick={() => setStep(s => s - 1)}>
                <ArrowLeft weight="regular" className="w-3.5 h-3.5" /> Back
              </Button>
            ) : (
              <div />
            )}

            {step < STEPS.length ? (
              <div className="flex items-center gap-2">
                {step === 3 && (
                  <Button type="button" intent="outline" size="sm" onClick={finish} disabled={saving}>
                    Skip &amp; finish
                  </Button>
                )}
                <Button
                  type="button"
                  intent="primary"
                  size="sm"
                  onClick={() => {
                    if (step === 1 && !step1.full_name.trim()) { setError('Please enter your name'); return }
                    setError(null)
                    setStep(s => s + 1)
                  }}
                >
                  Continue <ArrowRight weight="regular" className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button type="button" intent="primary" size="sm" onClick={finish} disabled={saving}>
                  {saving ? 'Setting up…' : 'Go to dashboard'} {!saving && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-text-secondary mt-4">
          You can update all of this later in Settings
        </p>
      </div>
    </div>
  )
}
