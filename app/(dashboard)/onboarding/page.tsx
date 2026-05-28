'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Events } from '@/lib/posthog-events'
import { track } from '@/lib/posthog-track'
import { useRouter } from 'next/navigation'
import { Check, ArrowRight, ArrowLeft } from 'lucide-react'

const inputClass = 'w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

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
    monthly_personal_outgoings:  '',   // personal living costs (NEW)
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

    if (err) { setError(err.message); setSaving(false); return }
    track(user.id, Events.ONBOARDING_COMPLETED)
    track(user.id, Events.PROFILE_UPDATED, { source: 'onboarding' })
    router.push('/dashboard')
    router.refresh()
  }

  const progress = ((step - 1) / (STEPS.length - 1)) * 100

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 28, fontWeight: 800, color: '#111', letterSpacing: '-0.03em' }}>
            Freelax
          </span>
          <p className="text-sm text-slate-500 mt-1">Let's get you set up — takes about 2 minutes</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-colors ${
                step > s.id
                  ? 'bg-slate-900 text-white'
                  : step === s.id
                  ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                  : 'bg-slate-200 text-slate-400'
              }`}>
                {step > s.id ? <Check className="w-3.5 h-3.5" /> : s.id}
              </div>
              <div className="ml-2 hidden sm:block">
                <p className={`text-xs font-medium ${step >= s.id ? 'text-slate-800' : 'text-slate-400'}`}>{s.label}</p>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 mx-3 bg-slate-200 rounded">
                  <div
                    className="h-full bg-slate-900 rounded transition-all duration-300"
                    style={{ width: step > s.id ? '100%' : '0%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg mb-5">
              {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Tell us about yourself</h2>
                <p className="text-sm text-slate-500 mt-1">This appears on your invoices and account.</p>
              </div>
              <div>
                <label className={labelClass}>Full name <span className="text-red-400">*</span></label>
                <input
                  className={inputClass}
                  placeholder="Jane Smith"
                  value={step1.full_name}
                  onChange={e => setStep1(p => ({ ...p, full_name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Phone number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  className={inputClass}
                  placeholder="07700 000000"
                  value={step1.phone}
                  onChange={e => setStep1(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your business</h2>
                <p className="text-sm text-slate-500 mt-1">Used for tax calculations and invoices.</p>
              </div>
              <div>
                <label className={labelClass}>Trading name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  className={inputClass}
                  placeholder="Jane Smith Creative"
                  value={step2.business_name}
                  onChange={e => setStep2(p => ({ ...p, business_name: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Business type</label>
                <select
                  className={inputClass}
                  value={step2.business_type}
                  onChange={e => setStep2(p => ({ ...p, business_type: e.target.value }))}
                >
                  <option value="sole_trader">Sole Trader</option>
                  <option value="limited_company">Limited Company</option>
                  <option value="partnership">Partnership</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>UTR number <span className="text-slate-400 font-normal">(optional — for Self Assessment)</span></label>
                <input
                  className={inputClass}
                  placeholder="1234567890"
                  value={step2.utr_number}
                  onChange={e => setStep2(p => ({ ...p, utr_number: e.target.value }))}
                />
              </div>
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <div
                    onClick={() => setStep2(p => ({ ...p, vat_registered: !p.vat_registered }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${step2.vat_registered ? 'bg-slate-900' : 'bg-slate-200'}`}
                  >
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${step2.vat_registered ? 'translate-x-4' : ''}`} />
                  </div>
                  <span className="text-sm text-slate-700">VAT registered</span>
                </label>
                {step2.vat_registered && (
                  <div className="mt-3">
                    <label className={labelClass}>VAT number</label>
                    <input
                      className={inputClass}
                      placeholder="GB123456789"
                      value={step2.vat_number}
                      onChange={e => setStep2(p => ({ ...p, vat_number: e.target.value }))}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Your address</h2>
                <p className="text-sm text-slate-500 mt-1">Appears on invoices you send to clients.</p>
              </div>
              <div>
                <label className={labelClass}>Address line 1</label>
                <input
                  className={inputClass}
                  placeholder="10 Downing Street"
                  value={step3.address_line1}
                  onChange={e => setStep3(p => ({ ...p, address_line1: e.target.value }))}
                  autoFocus
                />
              </div>
              <div>
                <label className={labelClass}>Address line 2 <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  className={inputClass}
                  value={step3.address_line2}
                  onChange={e => setStep3(p => ({ ...p, address_line2: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City</label>
                  <input
                    className={inputClass}
                    placeholder="London"
                    value={step3.city}
                    onChange={e => setStep3(p => ({ ...p, city: e.target.value }))}
                  />
                </div>
                <div>
                  <label className={labelClass}>Postcode</label>
                  <input
                    className={inputClass}
                    placeholder="SW1A 2AA"
                    value={step3.postcode}
                    onChange={e => setStep3(p => ({ ...p, postcode: e.target.value }))}
                  />
                </div>
              </div>

              {/* Summary recap */}
              <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-1.5 border border-slate-100">
                <p className="font-medium text-slate-700 mb-2 text-xs uppercase tracking-wide">Summary</p>
                <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium">{step1.full_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Business</span><span className="font-medium">{step2.business_name || step1.full_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium capitalize">{step2.business_type.replace(/_/g, ' ')}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">VAT</span><span className="font-medium">{step2.vat_registered ? step2.vat_number || 'Registered' : 'Not registered'}</span></div>
              </div>
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Personal tax inputs</h2>
                <p className="text-sm text-slate-500 mt-1">Improves the accuracy of your tax estimates. You can skip and set these later in Settings.</p>
              </div>

              {/* NEW: monthly expenses estimate — shown first, most immediately useful */}
<div>
                <label className={labelClass}>
                  Typical monthly personal outgoings <span className="text-slate-400 font-normal">(£, optional but recommended)</span>
                </label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  placeholder="e.g. 2500"
                  value={step4.monthly_personal_outgoings}
                  onChange={e => setStep4(p => ({ ...p, monthly_personal_outgoings: e.target.value }))}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Rent or mortgage, food, bills, subscriptions — the fixed cost of your life each month. We use this to show what's genuinely safe to spend.
                </p>
              </div>

              <div>
                <label className={labelClass}>Student loan plan</label>
                <select
                  className={inputClass}
                  value={step4.student_loan_plan}
                  onChange={e => setStep4(p => ({ ...p, student_loan_plan: e.target.value }))}
                >
                  <option value="none">None</option>
                  <option value="plan1">Plan 1</option>
                  <option value="plan2">Plan 2</option>
                  <option value="plan4">Plan 4 (Scotland)</option>
                  <option value="plan5">Plan 5</option>
                  <option value="postgrad">Postgraduate loan</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Annual pension contributions <span className="text-slate-400 font-normal">(£, optional)</span></label>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  placeholder="e.g. 3000"
                  value={step4.pension_contributions}
                  onChange={e => setStep4(p => ({ ...p, pension_contributions: e.target.value }))}
                />
              </div>
              {step2.business_type === 'limited_company' && (
                <>
                  <div>
                    <label className={labelClass}>Salary drawn from company <span className="text-slate-400 font-normal">(£ per year, optional)</span></label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      placeholder="e.g. 12570"
                      value={step4.salary_drawn}
                      onChange={e => setStep4(p => ({ ...p, salary_drawn: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Dividends drawn from company <span className="text-slate-400 font-normal">(£ per year, optional)</span></label>
                    <input
                      className={inputClass}
                      type="number"
                      min="0"
                      placeholder="e.g. 40000"
                      value={step4.dividends_drawn}
                      onChange={e => setStep4(p => ({ ...p, dividends_drawn: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <p className="text-xs text-slate-400">These figures affect tax estimates only and are never shared.</p>
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < STEPS.length ? (
              <div className="flex items-center gap-2">
                {step === 3 && (
                  <button
                    onClick={finish}
                    disabled={saving}
                    className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                  >
                    Skip &amp; finish
                  </button>
                )}
                <button
                  onClick={() => {
                    if (step === 1 && !step1.full_name.trim()) { setError('Please enter your name'); return }
                    setError(null)
                    setStep(s => s + 1)
                  }}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800"
                >
                  Continue <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={finish}
                  disabled={saving}
                  className="flex items-center gap-1.5 px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
                >
                  {saving ? 'Setting up…' : 'Go to dashboard'} {!saving && <ArrowRight className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          You can update all of this later in Settings
        </p>
      </div>
    </div>
  )
}
