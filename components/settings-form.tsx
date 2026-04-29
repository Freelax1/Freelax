'use client'

import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Upload, X, Building2 } from 'lucide-react'
import InfoTooltip from '@/components/info-tooltip'

interface Props {
  profile: any
  email: string
}

const inputClass = 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white'
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5'

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        onClick={() => onChange(!checked)}
        className={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-slate-900' : 'bg-slate-200'}`}
      >
        <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : ''}`} />
      </div>
      {label && <span className="text-sm text-slate-700">{label}</span>}
    </label>
  )
}

// Sort code auto-formatter: 123456 → 12-34-56
function formatSortCode(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  if (digits.length <= 4) return `${digits.slice(0, 2)}-${digits.slice(2)}`
  return `${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4)}`
}

const TABS = ['Profile', 'Business details', 'Personal tax inputs', 'Invoice Defaults', 'Quote Defaults', 'Banking', 'Notifications', 'Billing', 'Accountant Access', 'Danger Zone']


// ── Billing section component ─────────────────────────────────────────────────
function BillingSection({ profile }: { profile: any }) {
  const [yearly, setYearly] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const [showUpgradeMsg, setShowUpgradeMsg] = useState<string | null>(null)

  const currentPlan = profile?.subscription_plan ?? 'free'
  const currentStatus = profile?.subscription_status ?? 'active'

  const plans = [
    {
      id: 'solo',
      name: 'Solo',
      monthly: 9,
      yearly: 79,
      yearlySaving: 29,
      badge: null,
      description: 'For freelancers just starting out',
      features: [
        '10 invoices / month',
        '3 active clients',
        '20 expenses / month',
        'Full UK tax engine',
        'IR35 assessment',
        'Basic P&L summary',
        '50 AI calls / month',
      ],
      missing: ['Email invoice sending', 'Stripe payment links', 'Recurring invoices'],
    },
    {
      id: 'pro',
      name: 'Pro',
      monthly: 19,
      yearly: 159,
      yearlySaving: 69,
      badge: 'Most popular',
      description: 'For active freelancers — the main tier',
      features: [
        'Unlimited invoices',
        'Unlimited clients',
        'Unlimited expenses',
        'Send invoices by email',
        'Stripe payment links',
        'Recurring invoices',
        'All 6 AI features',
        '150 AI calls / month',
        'Accountant access',
        'VAT tracker',
      ],
      missing: [],
    },
    {
      id: 'studio',
      name: 'Studio',
      monthly: 39,
      yearly: 329,
      yearlySaving: 139,
      badge: null,
      description: 'For agencies and established freelancers',
      features: [
        'Everything in Pro',
        '3 user seats',
        'Client portal',
        'White-labelled experience',
        '750 AI calls / month',
        'Advanced financial reports',
        'IR35 audit trail PDF',
        'Bulk expense import',
        'Mileage tracker',
        'Onboarding call',
      ],
      missing: [],
    },
  ]

  function handleUpgrade(planId: string) {
    setShowUpgradeMsg(planId)
    setTimeout(() => setShowUpgradeMsg(null), 6000)
  }

  return (
    <div className="space-y-6">
      {/* Current plan banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="font-semibold text-slate-900 mb-4">Billing</h2>
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <p className="text-sm text-slate-500 mb-0.5">Current plan</p>
            <p className="text-base font-bold text-slate-900 capitalize">{currentPlan}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 mb-0.5">Status</p>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-0.5 rounded-full ${
              currentStatus === 'active' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
              {currentStatus}
            </span>
          </div>
          {currentPlan !== 'free' && (
            <p className="text-sm text-slate-500">
              To manage your subscription email{' '}
              <a href="mailto:support@freelax.co.uk" className="font-medium text-slate-700 underline underline-offset-2">
                support@freelax.co.uk
              </a>
            </p>
          )}
        </div>
      </div>

      {/* Plan cards — always shown, current plan highlighted */}
      {currentPlan !== 'studio' ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          {/* Heading + yearly toggle */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h3 className="font-semibold text-slate-900">
                {currentPlan === 'free' ? 'Upgrade your plan' : 'Upgrade to a higher plan'}
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">More features, no spreadsheets, no January panic.</p>
            </div>
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setYearly(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!yearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearly ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
              >
                Yearly
                <span className="ml-1.5 text-green-600 font-semibold">Save 30%</span>
              </button>
            </div>
          </div>

          {/* Plan cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {plans.map(plan => {
              const planOrder = ['free', 'solo', 'pro', 'studio']
              const isCurrent = plan.id === currentPlan
              const isBelow = planOrder.indexOf(plan.id) < planOrder.indexOf(currentPlan)
              const isDark = plan.id === 'pro' && !isCurrent && !isBelow

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-xl border-2 p-5 flex flex-col transition-all ${
                    isCurrent
                      ? 'border-green-400 bg-green-50'
                      : isBelow
                      ? 'border-slate-100 bg-slate-50 opacity-50'
                      : isDark
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Current plan badge */}
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                      Current plan
                    </div>
                  )}
                  {/* Most popular badge */}
                  {plan.badge && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  <p className={`text-xs font-semibold uppercase tracking-widest mb-2 ${isDark ? 'text-slate-400' : isCurrent ? 'text-green-600' : 'text-slate-400'}`}>
                    {plan.name}
                  </p>

                  <div className="mb-1">
                    <span className={`text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      £{yearly ? Math.round(plan.yearly / 12) : plan.monthly}
                    </span>
                    <span className={`text-sm ml-1 ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>/mo</span>
                  </div>
                  {yearly && (
                    <p className={`text-xs mb-3 ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                      £{plan.yearly}/year · save £{plan.yearlySaving}
                    </p>
                  )}

                  <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <svg className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isDark ? 'text-green-400' : 'text-green-600'}`} viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={isDark ? 'text-slate-300' : 'text-slate-600'}>{f}</span>
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-slate-300" viewBox="0 0 14 14" fill="none">
                          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-green-100 text-green-700 border border-green-200">
                      ✓ Your current plan
                    </div>
                  ) : isBelow ? (
                    <div className="w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-slate-100 text-slate-400">
                      Lower plan
                    </div>
                  ) : (
                    showUpgradeMsg === plan.id ? (
                      <div className={`w-full py-2.5 px-3 rounded-lg text-xs text-center leading-relaxed ${
                        isDark ? 'bg-white/10 text-slate-300' : 'bg-slate-100 text-slate-600'
                      }`}>
                        Contact{' '}
                        <a href="mailto:support@freelax.co.uk" className={`font-semibold underline underline-offset-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                          support@freelax.co.uk
                        </a>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          isDark
                            ? 'bg-white text-slate-900 hover:bg-slate-100'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                      >
                        Upgrade to {plan.name}
                      </button>
                    )
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-slate-400">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Secure payment powered by Stripe · Cancel any time · No hidden fees
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9l4 4 7-7" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-slate-900">You are on the Studio plan</p>
              <p className="text-sm text-slate-500 mt-0.5">This is our highest tier — you have access to everything Freelax offers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsForm({ profile, email }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const searchParams = useSearchParams()
  const [tab, setTab] = useState(() => {
    const t = searchParams.get('tab')
    if (!t) return 'Profile'
    const decoded = decodeURIComponent(t.replace(/\+/g, ' '))
    // Case-insensitive match — URL uses lowercase (e.g. ?tab=billing), TABS uses title case
    const match = TABS.find(name => name.toLowerCase() === decoded.toLowerCase())
    return match ?? 'Profile'
  })
  const [saving, setSaving] = useState(false)
  const [acctEmail, setAcctEmail]   = useState('')
  const [acctInvites, setAcctInvites] = useState<any[]>([])
  const [acctSending, setAcctSending] = useState(false)
  const [acctMsg, setAcctMsg]       = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load accountant invites
  useEffect(() => {
    fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
  }, [])

  async function sendAccountantInvite() {
    if (!acctEmail.trim()) return
    setAcctSending(true)
    const res  = await fetch('/api/accountant/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acctEmail.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setAcctMsg('Invite sent successfully')
      setAcctEmail('')
      fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
    } else {
      setAcctMsg(data.error ?? 'Failed to send invite')
    }
    setAcctSending(false)
    setTimeout(() => setAcctMsg(null), 4000)
  }

  async function revokeAccountantInvite(id: string) {
    await fetch('/api/accountant/invite', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
  }

  // Logo
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)

  // Profile
  const [pf, setPf] = useState({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' })

  // Business details
  const [bf, setBf] = useState({
    business_name: profile?.business_name ?? '',
    business_type: profile?.business_type ?? 'sole_trader',
    vat_registered: profile?.vat_registered ?? false,
    vat_number: profile?.vat_number ?? '',
    vat_scheme: profile?.vat_scheme ?? 'standard',
    utr_number: profile?.utr_number ?? '',
  })

  // Invoice Defaults (address)
  const [inf, setInf] = useState({
    address_line1: profile?.address_line1 ?? '',
    address_line2: profile?.address_line2 ?? '',
    city: profile?.city ?? '',
    postcode: profile?.postcode ?? '',
  })

  // Banking
  const [bank, setBank] = useState({
    bank_account_name:   profile?.bank_account_name   ?? '',
    bank_sort_code:      profile?.bank_sort_code       ?? '',
    bank_account_number: profile?.bank_account_number  ?? '',
    bank_reference_note: profile?.bank_reference_note  ?? '',
  })

  // Quote Defaults
  const [qd, setQd] = useState({
    quote_validity_days:  profile?.quote_validity_days  ?? 30,
    quote_default_notes:  profile?.quote_default_notes  ?? '',
    quote_email_subject:  profile?.quote_email_subject  ?? 'Quote {{quote_number}} from {{business_name}}',
    quote_email_body:     profile?.quote_email_body     ?? '',
  })

  // Tax Profile
  const [tp, setTp] = useState({
    student_loan_plan:           profile?.student_loan_plan           ?? 'none',
    pension_contributions:       profile?.pension_contributions       ?? '',
    salary_drawn:                profile?.salary_drawn                ?? '',
    dividends_drawn:             profile?.dividends_drawn             ?? '',
    monthly_personal_outgoings:  profile?.monthly_personal_outgoings  ?? '',
    other_income:                profile?.other_income                ?? '',
    investment_dividends:        profile?.investment_dividends        ?? '',
  })

  async function save(data: Record<string, any>) {
    setSaving(true)
    setError(null)
    const supabase = createClient()
    const { error: err } = await supabase
      .from('users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', profile.id)
    setSaving(false)
    if (err) { setError(err.message); return }
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
    router.refresh()
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/settings/upload-logo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setLogoError(json.error ?? 'Upload failed'); return }
      setLogoUrl(json.url)
    } catch {
      setLogoError('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeLogo() {
    setLogoUrl(null)
    const supabase = createClient()
    await supabase.from('users').update({ logo_url: null, updated_at: new Date().toISOString() }).eq('id', profile.id)
  }

  const btnClass = 'px-5 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors'

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Sidebar nav */}
      <div className="w-full lg:w-44 shrink-0">
        <nav className="flex flex-row flex-wrap lg:flex-col gap-1 lg:gap-0 lg:space-y-0.5">
          {TABS.map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t
                  ? 'bg-slate-100 text-slate-900'
                  : t === 'Danger Zone'
                  ? 'text-red-600 hover:bg-red-50'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
        <button
          onClick={async () => {
            const supabase = createClient()
            await supabase.auth.signOut()
            router.push('/auth/login')
            router.refresh()
          }}
          className="lg:hidden mt-3 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 max-w-xl space-y-4">
        {saved && (
          <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2.5 rounded-lg">✓ Saved successfully</div>
        )}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">Error: {error}</div>
        )}

        {/* ── Profile ── */}
        {tab === 'Profile' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
            <h2 className="font-semibold text-slate-900">Profile</h2>

            {/* Logo upload */}
            <div>
              <label className={labelClass}>Business logo</label>
              <div className="flex items-center gap-4">
                {logoUrl ? (
                  <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
                    <button
                      onClick={removeLogo}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center border border-slate-200 hover:bg-red-50 hover:border-red-200"
                    >
                      <X className="w-3 h-3 text-slate-500" />
                    </button>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
                    <Upload className="w-5 h-5 text-slate-300" />
                  </div>
                )}
                <div>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={logoUploading}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {logoUploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
                  </button>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG or SVG · max 2 MB</p>
                  {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
                </div>
              </div>
            </div>

            <Field label="Full name">
              <input className={inputClass} value={pf.full_name} onChange={e => setPf(p => ({ ...p, full_name: e.target.value }))} />
            </Field>
            <Field label="Email">
              <input className={`${inputClass} bg-slate-50 text-slate-400`} value={email} readOnly />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
            </Field>
            <Field label="Phone">
              <input className={inputClass} value={pf.phone} onChange={e => setPf(p => ({ ...p, phone: e.target.value }))} placeholder="07700 000000" />
            </Field>
            <button className={btnClass} disabled={saving} onClick={() => save(pf)}>
              {saving ? 'Saving...' : 'Save profile'}
            </button>
          </div>
        )}

        {/* ── Business details ── */}
        {tab === 'Business details' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Business details</h2>
            <Field label="Business name">
              <input className={inputClass} value={bf.business_name} onChange={e => setBf(p => ({ ...p, business_name: e.target.value }))} />
            </Field>
            <Field label="Business type">
              <select className={inputClass} value={bf.business_type} onChange={e => setBf(p => ({ ...p, business_type: e.target.value }))}>
                <option value="sole_trader">Sole Trader</option>
                <option value="limited_company">Limited Company</option>
                <option value="partnership">Partnership</option>
              </select>
            </Field>
            <Toggle checked={bf.vat_registered} onChange={v => setBf(p => ({ ...p, vat_registered: v }))} label="VAT registered" />
            {bf.vat_registered && (
              <>
                <Field label="VAT number">
                  <input className={inputClass} value={bf.vat_number} onChange={e => setBf(p => ({ ...p, vat_number: e.target.value }))} placeholder="GB123456789" />
                </Field>
                <Field label="VAT scheme">
                  <select className={inputClass} value={bf.vat_scheme} onChange={e => setBf(p => ({ ...p, vat_scheme: e.target.value }))}>
                    <option value="standard">Standard</option>
                    <option value="flat_rate">Flat Rate</option>
                  </select>
                </Field>
              </>
            )}
            <Field label="UTR number">
              <input className={inputClass} value={bf.utr_number} onChange={e => setBf(p => ({ ...p, utr_number: e.target.value }))} placeholder="1234567890" />
            </Field>
            <button className={btnClass} disabled={saving} onClick={() => save(bf)}>
              {saving ? 'Saving...' : 'Save business details'}
            </button>
          </div>
        )}

        {/* ── Tax Profile ── */}
        {tab === 'Personal tax inputs' && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Tax profile</h2>
                <p className="text-sm text-slate-500 mt-1">
                  These details make your tax estimates accurate. None of this is sent to HMRC — it's used only to calculate your take-home and tax pot.
                </p>
              </div>

              <Field
                label="Typical monthly personal outgoings (£)"
                hint="Rent/mortgage, food, bills, subscriptions — the fixed cost of your life. Used to calculate 'Safe to spend' on your dashboard."
              >
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputClass}
                  value={tp.monthly_personal_outgoings}
                  onChange={e => setTp(p => ({ ...p, monthly_personal_outgoings: e.target.value }))}
                  placeholder="e.g. 2500"
                />
              </Field>

              <Field label={<span>Student loan<InfoTooltip>Repayments at 9% on income over £29,385 per year (Plan 2). Most post-2012 UK undergraduates have Plan 2. Deducted automatically through Self Assessment.</InfoTooltip></span>} hint="Affects how much is deducted from your take-home through Self Assessment">
                <select className={inputClass} value={tp.student_loan_plan} onChange={e => setTp(p => ({ ...p, student_loan_plan: e.target.value }))}>
                  <option value="none">No student loan</option>
                  <option value="plan1">Plan 1 — started before Sep 2012 (threshold £24,990)</option>
                  <option value="plan2">Plan 2 — started Sep 2012–Jul 2023 (threshold £27,295)</option>
                  <option value="plan4">Plan 4 — Scottish loans (threshold £31,395)</option>
                  <option value="plan5">Plan 5 — started Aug 2023+ (threshold £25,000)</option>
                  <option value="postgrad">Postgraduate loan (threshold £21,000)</option>
                </select>
              </Field>

              <Field
                label={<span>Annual pension contributions (£)<InfoTooltip>Contributions to a SIPP or personal pension reduce your taxable income pound-for-pound — the single biggest legal tax saving available to freelancers.</InfoTooltip></span>}
                hint="Contributions to a SIPP or personal pension. These reduce your taxable income and extend your basic rate band — the single biggest legal tax saving available to freelancers."
              >
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputClass}
                  value={tp.pension_contributions}
                  onChange={e => setTp(p => ({ ...p, pension_contributions: e.target.value }))}
                  placeholder="0"
                />
              </Field>

              {bf.business_type === 'limited_company' && (
                <>
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    As a limited company director, enter the salary and dividends you actually draw. This gives you an accurate personal tax calculation separate from your company's corporation tax.
                  </div>
                  <Field
                    label="Annual director salary (£)"
                    hint="Most tax-efficient is usually £12,570 (Personal Allowance) or £5,000 (below NI threshold). Talk to your accountant."
                  >
                    <input
                      type="number"
                      min="0"
                      step="100"
                      className={inputClass}
                      value={tp.salary_drawn}
                      onChange={e => setTp(p => ({ ...p, salary_drawn: e.target.value }))}
                      placeholder="12570"
                    />
                  </Field>
                  <Field
                    label={<span>Annual dividends drawn (£)<InfoTooltip>Dividends from your company are taxed at lower rates than salary. First £500 is free, then 10.75% / 35.75% / 39.35% depending on your tax band.</InfoTooltip></span>}
                    hint="Dividends are taxed at lower rates than salary (10.75% / 35.75% / 39.35%) with a £500 tax-free allowance."
                  >
                    <input
                      type="number"
                      min="0"
                      step="100"
                      className={inputClass}
                      value={tp.dividends_drawn}
                      onChange={e => setTp(p => ({ ...p, dividends_drawn: e.target.value }))}
                      placeholder="0"
                    />
                  </Field>
                </>
              )}

              <Field
                label="Other income (annual, £)"
                hint="PAYE employment, rental income, savings interest or any other taxable income outside your freelance work."
              >
                <input
                  type="number"
                  min="0"
                  step="100"
                  className={inputClass}
                  value={tp.other_income}
                  onChange={e => setTp(p => ({ ...p, other_income: e.target.value }))}
                  placeholder="0"
                />
              </Field>

              {bf.business_type === 'sole_trader' && (
                <Field
                  label="Investment dividends (annual, £)"
                  hint="Dividends from shares, funds or investment ISAs. Not dividends from your own limited company."
                >
                  <input
                    type="number"
                    min="0"
                    step="100"
                    className={inputClass}
                    value={tp.investment_dividends}
                    onChange={e => setTp(p => ({ ...p, investment_dividends: e.target.value }))}
                    placeholder="0"
                  />
                </Field>
              )}

              <button
                className={btnClass}
                disabled={saving}
                onClick={() => save({
                  student_loan_plan: tp.student_loan_plan,
                  pension_contributions: Number(tp.pension_contributions) || 0,
                  salary_drawn: tp.salary_drawn !== '' ? Number(tp.salary_drawn) : null,
                  dividends_drawn: tp.dividends_drawn !== '' ? Number(tp.dividends_drawn) : null,
                  monthly_personal_outgoings: tp.monthly_personal_outgoings !== '' ? Number(tp.monthly_personal_outgoings) : null,
                  other_income: tp.other_income !== '' ? Number(tp.other_income) : 0,
                  investment_dividends: tp.investment_dividends !== '' ? Number(tp.investment_dividends) : 0,
                })}
              >
                {saving ? 'Saving...' : 'Save tax profile'}
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 text-xs text-slate-500 leading-relaxed">
              <p className="font-medium text-slate-600 mb-1">Why does this matter?</p>
              <p>Without these details, Freelax can only estimate basic Income Tax and NI. With them, it calculates your actual take-home after student loan, pension, and for Ltd company directors — the difference between salary and dividend tax. The more accurate your profile, the better your cash flow planning.</p>
            </div>
          </div>
        )}

        {/* ── Invoice Defaults ── */}
        {tab === 'Invoice Defaults' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Invoice Defaults</h2>
            <p className="text-sm text-slate-500">This address appears on all invoices sent to clients.</p>
            <Field label="Address line 1">
              <input className={inputClass} value={inf.address_line1} onChange={e => setInf(p => ({ ...p, address_line1: e.target.value }))} />
            </Field>
            <Field label="Address line 2">
              <input className={inputClass} value={inf.address_line2} onChange={e => setInf(p => ({ ...p, address_line2: e.target.value }))} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="City">
                <input className={inputClass} value={inf.city} onChange={e => setInf(p => ({ ...p, city: e.target.value }))} />
              </Field>
              <Field label="Postcode">
                <input className={inputClass} value={inf.postcode} onChange={e => setInf(p => ({ ...p, postcode: e.target.value }))} placeholder="E1 1AA" />
              </Field>
            </div>
            <button className={btnClass} disabled={saving} onClick={() => save(inf)}>
              {saving ? 'Saving...' : 'Save invoice defaults'}
            </button>
          </div>
        )}

        {/* ── Quote Defaults ── */}
        {tab === 'Quote Defaults' && (
          <div className="space-y-4">

            {/* Quote defaults */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div>
                <h2 className="font-semibold text-slate-900">Quote defaults</h2>
                <p className="text-sm text-slate-500 mt-1">Pre-filled on every new quote you create.</p>
              </div>
              <Field label="Default validity period (days)" hint="How many days a quote stays open. 30 days is standard.">
                <input
                  type="number" min="1" max="365"
                  className={inputClass}
                  value={qd.quote_validity_days}
                  onChange={e => setQd(p => ({ ...p, quote_validity_days: parseInt(e.target.value) || 30 }))}
                />
              </Field>
              <Field label="Default notes" hint="Appears at the bottom of every quote. Can be overridden per quote.">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={qd.quote_default_notes}
                  onChange={e => setQd(p => ({ ...p, quote_default_notes: e.target.value }))}
                  placeholder="e.g. All prices exclude VAT. Subject to our standard terms and conditions."
                />
              </Field>
              <button className={btnClass} disabled={saving} onClick={() => save({
                quote_validity_days: qd.quote_validity_days,
                quote_default_notes: qd.quote_default_notes,
              })}>
                {saving ? 'Saving...' : 'Save quote defaults'}
              </button>
            </div>

            {/* Email message */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-slate-900">Quote email message</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Add a personal message to include in the email when you send a quote.
                  The quote number, amount, expiry date and a link to view the quote are added automatically.
                </p>
              </div>
              <Field label="Personal message">
                <textarea
                  rows={5}
                  className={inputClass}
                  value={qd.quote_email_body}
                  onChange={e => setQd(p => ({ ...p, quote_email_body: e.target.value }))}
                  placeholder="e.g. Thank you for the opportunity. Please find your quote attached. Feel free to get in touch if you have any questions."
                />
              </Field>
              <button className={btnClass} disabled={saving} onClick={() => save({
                quote_email_body: qd.quote_email_body,
              })}>
                {saving ? 'Saving...' : 'Save message'}
              </button>
            </div>
          </div>
        )}

                {/* ── Banking ── */}
        {tab === 'Banking' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              These details appear on your invoice PDFs only. Freelax does not process payments or access your bank account.
            </p>
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="w-4 h-4 text-slate-400" />
                <h2 className="font-semibold text-slate-900">Bank details</h2>
              </div>
              <p className="text-sm text-slate-500">
                These appear on all invoices and payment reminder emails, making it easy for clients to pay you directly.
              </p>

              <Field label="Account name" hint="Usually your full name or business name as registered with your bank">
                <input
                  className={inputClass}
                  value={bank.bank_account_name}
                  onChange={e => setBank(p => ({ ...p, bank_account_name: e.target.value }))}
                  placeholder="Jane Smith"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Sort code" hint="Format: 12-34-56">
                  <input
                    className={inputClass}
                    value={bank.bank_sort_code}
                    onChange={e => setBank(p => ({ ...p, bank_sort_code: formatSortCode(e.target.value) }))}
                    placeholder="12-34-56"
                    maxLength={8}
                  />
                </Field>
                <Field label="Account number" hint="8 digits">
                  <input
                    className={inputClass}
                    value={bank.bank_account_number}
                    onChange={e => setBank(p => ({ ...p, bank_account_number: e.target.value.replace(/\D/g, '').slice(0, 8) }))}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </Field>
              </div>

              <Field
                label="Payment reference note"
                hint='Shown on invoices under bank details, e.g. "Please use invoice number as reference"'
              >
                <input
                  className={inputClass}
                  value={bank.bank_reference_note}
                  onChange={e => setBank(p => ({ ...p, bank_reference_note: e.target.value }))}
                  placeholder="Please use invoice number as reference"
                />
              </Field>

              <button className={btnClass} disabled={saving} onClick={() => save(bank)}>
                {saving ? 'Saving...' : 'Save bank details'}
              </button>
            </div>

            {/* Preview */}
            {(bank.bank_sort_code || bank.bank_account_number) && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Invoice preview</p>
                <div className="space-y-1.5 text-sm">
                  {[
                    { label: 'Account name',   value: bank.bank_account_name || '—' },
                    { label: 'Sort code',      value: bank.bank_sort_code || '—' },
                    { label: 'Account number', value: bank.bank_account_number || '—' },
                    { label: 'Reference',      value: bank.bank_reference_note || 'Invoice number' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between">
                      <span className="text-slate-400">{r.label}</span>
                      <span className="font-medium text-slate-800">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Notifications ── */}
        {tab === 'Notifications' && (
          <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            <p className="text-sm text-slate-500">Email reminders sent to your account email.</p>
            {[
              { label: 'Invoices overdue',         desc: 'After 7 days past due date' },
              { label: 'VAT threshold approaching', desc: 'When rolling income nears £90,000' },
              { label: 'Self Assessment deadline',  desc: '31 January reminder' },
              { label: 'Tax year end',              desc: '5 April reminder' },
            ].map(n => (
              <div key={n.label} className="flex items-start justify-between py-3 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-medium text-slate-700">{n.label}</p>
                  <p className="text-xs text-slate-400">{n.desc}</p>
                </div>
                <Toggle checked={false} onChange={() => {}} />
              </div>
            ))}
          </div>
        )}

        {/* ── Billing ── */}
        {tab === 'Billing' && (
          <BillingSection profile={profile} />
        )}

        {/* ── Danger Zone ── */}
        {tab === 'Accountant Access' && (
          <div className="space-y-6">
            <div>
              <h2 className="font-semibold text-slate-900 mb-1">Accountant access</h2>
              <p className="text-sm text-slate-500 mb-4">
                Invite your accountant to view your Freelax data in read-only mode. They can see invoices, expenses, and tax summaries but cannot make any changes.
              </p>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="accountant@example.com"
                  value={acctEmail}
                  onChange={e => setAcctEmail(e.target.value)}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  onClick={sendAccountantInvite}
                  disabled={acctSending || !acctEmail.trim()}
                  className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
                >
                  {acctSending ? 'Sending…' : 'Send invite'}
                </button>
              </div>
              {acctMsg && (
                <p className={`text-sm mt-2 ${acctMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{acctMsg}</p>
              )}
            </div>
            {acctInvites.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Active invites</p>
                <div className="space-y-2">
                  {acctInvites.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {inv.accepted_at
                            ? `Accepted ${new Date(inv.accepted_at).toLocaleDateString('en-GB')}`
                            : inv.revoked_at
                            ? `Revoked ${new Date(inv.revoked_at).toLocaleDateString('en-GB')}`
                            : `Invited ${new Date(inv.created_at).toLocaleDateString('en-GB')} · Pending`}
                        </p>
                      </div>
                      {!inv.revoked_at && (
                        <button
                          onClick={() => revokeAccountantInvite(inv.id)}
                          className="text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'Danger Zone' && (
          <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
            <h2 className="font-semibold text-red-700">Danger Zone</h2>
            <div className="py-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">Export all data</p>
                <p className="text-xs text-slate-400">Download a full export of your account data as CSV</p>
              </div>
              <a
                href="/api/invoices/export?type=full"
                className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
              >
                Export
              </a>
            </div>
            <div className="py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Delete account</p>
                <p className="text-xs text-slate-400">Permanently delete your account and all data</p>
              </div>
              <button className="px-4 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">Delete</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
