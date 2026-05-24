'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Tooltip from '@/components/tooltip'
import Alert from '@/components/ui/alert'
import Button from '@/components/ui/button'

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
        <Alert intent="success" className="px-5 py-4">
          <div className="flex items-center gap-3 w-full">
            <p className="text-sm font-medium flex-1">You're all set — your plan has been upgraded successfully.</p>
            <Tooltip label="Dismiss" align="right">
              <button onClick={() => setUpgraded(false)} className="text-success-500 hover:text-success-700">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </Tooltip>
          </div>
        </Alert>
      )}

      {/* Current plan banner */}
      <div className="pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-surface-sunken rounded-xl border border-border-subtle">
          <div>
            <p className="text-sm text-text-muted mb-0.5">Current plan</p>
            <p className="text-base font-semibold text-text-primary capitalize">{currentPlan}</p>
          </div>
          <div>
            <p className="text-sm text-text-muted mb-0.5">Status</p>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-0.5 rounded-lg ${
              currentStatus === 'active' ? 'bg-success-50 text-success-700 border border-success-200' : 'bg-danger-50 text-danger-700 border border-danger-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${currentStatus === 'active' ? 'bg-success-500' : 'bg-danger-500'}`} />
              {currentStatus}
            </span>
          </div>
          {currentPlan !== 'free' && (
            <Button
              type="button"
              intent="ghost"
              size="sm"
              onClick={handleManage}
              disabled={loading === 'portal'}
              className="underline underline-offset-2 px-0 h-auto"
            >
              {loading === 'portal' ? 'Opening…' : 'Manage subscription →'}
            </Button>
          )}
        </div>
      </div>

      {/* Plan cards */}
      {!['pro', 'studio'].includes(currentPlan) ? (
        <div className="pb-6 border-b border-border-subtle last:border-0 last:pb-0">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div>
              <h3 className="font-semibold text-text-primary">
                {currentPlan === 'free' ? 'Upgrade your plan' : 'Upgrade to a higher plan'}
              </h3>
              <p className="text-sm text-text-muted mt-0.5">More features, no spreadsheets, no January panic.</p>
            </div>
            <div className="flex items-center gap-2 bg-surface-sunken rounded-xl p-1">
              <button
                onClick={() => setYearly(false)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${!yearly ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setYearly(true)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${yearly ? 'bg-surface-card text-text-primary shadow-sm' : 'text-text-muted'}`}
              >
                Yearly
                <span className="ml-1.5 text-success-600 font-semibold">Save 30%</span>
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
                      ? 'border-green-400 bg-success-50'
                      : isBelow
                      ? 'border-border-subtle bg-surface-sunken opacity-50'
                      : isDark
                      ? 'border-brand-primary bg-forest-50'
                      : 'border-border-default bg-surface-card hover:border-border-strong'
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-success-500 text-white text-xs font-semibold px-3 py-0.5 rounded-lg whitespace-nowrap">
                      Current plan
                    </div>
                  )}
                  {plan.badge && !isCurrent && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-warning-400 text-warning-900 text-xs font-semibold px-3 py-0.5 rounded-lg whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}

                  <p className={`text-xs font-semiboldst mb-2 ${isDark ? 'text-text-secondary' : isCurrent ? 'text-success-600' : 'text-text-secondary'}`}>
                    {plan.name}
                  </p>

                  <div className="mb-1">
                    <span className="text-3xl font-serif font-normal leading-none tabular-nums text-text-primary">
                      £{yearly ? Math.round(plan.yearly / 12) : plan.monthly}
                    </span>
                    <span className={`text-sm ml-1 ${isDark ? 'text-text-secondary' : 'text-text-secondary'}`}>/mo</span>
                  </div>
                  {yearly && (
                    <p className={`text-xs mb-3 ${isDark ? 'text-success-400' : 'text-success-600'}`}>
                      £{plan.yearly}/year · save £{plan.yearlySaving}
                    </p>
                  )}

                  <p className={`text-xs mb-4 leading-relaxed ${isDark ? 'text-text-secondary' : 'text-text-muted'}`}>
                    {plan.description}
                  </p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <svg className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${isDark ? 'text-success-400' : 'text-success-600'}`} viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span className={isDark ? 'text-text-muted' : 'text-text-secondary'}>{f}</span>
                      </li>
                    ))}
                    {plan.missing.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs">
                        <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-text-muted" viewBox="0 0 14 14" fill="none">
                          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span className="text-text-muted">{f}</span>
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-success-100 text-success-700 border border-success-200">
                      ✓ Your current plan
                    </div>
                  ) : isBelow ? (
                    <div className="w-full py-2.5 rounded-xl text-sm font-semibold text-center bg-surface-sunken text-text-secondary">
                      Lower plan
                    </div>
                  ) : (
                    <Button
                      type="button"
                      fullWidth
                      intent={isDark ? 'secondary' : 'primary'}
                      size="sm"
                      className={isDark ? 'py-2.5 rounded-xl font-semibold' : 'py-2.5 rounded-xl font-semibold'}
                      onClick={() => handleUpgrade(plan.id)}
                      disabled={!!loading}
                    >
                      {isLoading ? 'Redirecting to Stripe…' : `Upgrade to ${plan.name}`}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-center gap-2 mt-5 text-xs text-text-secondary">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            Secure payment powered by Stripe · Cancel any time · No hidden fees
          </div>
        </div>
      ) : (
        <div className="pb-6 border-b border-border-subtle last:border-0 last:pb-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-success-100 flex items-center justify-center flex-shrink-0">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3.5 9l4 4 7-7" stroke="var(--success-500)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="font-semibold text-text-primary">You're on the Pro plan</p>
              <p className="text-sm text-text-muted mt-0.5">You have access to everything Freelax offers.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
