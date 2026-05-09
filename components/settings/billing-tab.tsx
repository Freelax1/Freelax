'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface Props {
  profile: any
}

export default function BillingTab({ profile }: Props) {
  const [yearly, setYearly]     = useState(false)
  const [loading, setLoading]   = useState<string | null>(null)
  const [upgraded, setUpgraded] = useState(false)
  const searchParams = useSearchParams()

  const currentPlan   = profile?.subscription_plan   ?? 'free'
  const currentStatus = profile?.subscription_status ?? 'active'

  useEffect(() => {
    if (searchParams.get('upgraded') === 'true') setUpgraded(true)
  }, [searchParams])

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
        'Unlimited invoices',
        '5 active clients',
        'Unlimited expenses',
        'Full UK tax engine',
        'Basic P&L summary',
        '50 AI calls / month',
        'Email invoice sending',
        'Stripe payment links',
        'Mileage tracking',
        'CSV & PDF exports',
      ],
      missing: ['Recurring invoices', 'IR35 assessment', 'Accountant access'],
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
        'Everything in Solo',
        'Recurring invoices',
        'IR35 assessment',
        '150 AI calls / month',
        'Accountant access',
        'VAT tracker',
        'Priority support',
      ],
      missing: [],
    },
  ]

  async function handleUpgrade(planId: string) {
    setLoading(planId)
    try {
      const res  = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, billing: yearly ? 'annual' : 'monthly' }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Something went wrong. Please try again.')
        setLoading(null)
      }
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  async function handleManage() {
    setLoading('portal')
    try {
      const res  = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error ?? 'Something went wrong. Please try again.')
        setLoading(null)
      }
    } catch {
      alert('Something went wrong. Please try again.')
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* Upgrade success banner */}
      {upgraded && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="flex-shrink-0">
            <path d="M3.5 9l4 4 7-7" stroke="#16A34A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <p className="text-sm font-medium text-green-800">You're all set — your plan has been upgraded successfully.</p>
          <button onClick={() => setUpgraded(false)} className="ml-auto text-green-500 hover:text-green-700">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      )}

      {/* Current plan banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
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
            <button
              onClick={handleManage}
              disabled={loading === 'portal'}
              className="text-sm font-medium text-slate-700 underline underline-offset-2 hover:text-slate-900 disabled:opacity-50"
            >
              {loading === 'portal' ? 'Opening…' : 'Manage subscription →'}
            </button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      {!['pro', 'studio'].includes(currentPlan) ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plans.map(plan => {
              const planOrder = ['free', 'solo', 'pro']
              const isCurrent = plan.id === currentPlan
              const isBelow   = planOrder.indexOf(plan.id) < planOrder.indexOf(currentPlan)
              const isDark    = plan.id === 'pro' && !isCurrent && !isBelow
              const isLoading = loading === plan.id

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
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-xs font-bold px-3 py-0.5 rounded-full whitespace-nowrap">
                      Current plan
                    </div>
                  )}
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

                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-green-100 text-green-700 border border-green-200">
                      ✓ Your current plan
                    </div>
                  ) : isBelow ? (
                    <div className="w-full py-2.5 rounded-lg text-sm font-semibold text-center bg-slate-100 text-slate-400">
                      Lower plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={!!loading}
                      className={`w-full py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-60 ${
                        isDark
                          ? 'bg-white text-slate-900 hover:bg-slate-100'
                          : 'bg-slate-900 text-white hover:bg-slate-800'
                      }`}
                    >
                      {isLoading ? 'Redirecting to Stripe…' : `Upgrade to ${plan.name}`}
                    </button>
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
              <p className="font-semibold text-slate-900">You're on the Pro plan</p>
              <p className="text-sm text-slate-500 mt-0.5">You have access to everything Freelax offers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
