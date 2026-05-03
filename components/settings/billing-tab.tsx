'use client'

import { useState } from 'react'

interface Props {
  profile: any
}

export default function BillingTab({ profile }: Props) {
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
