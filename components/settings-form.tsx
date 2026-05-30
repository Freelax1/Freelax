'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TABS, TAB_GROUPS, TAB_DESCRIPTIONS, SettingsTab } from './settings/shared'
import { Events } from '@/lib/posthog-events'
import { track } from '@/lib/posthog-track'
import { toast } from '@/lib/toast'
import type { User } from '@/types/database'

import ProfileTab          from './settings/profile-tab'
import BusinessTab         from './settings/business-tab'
import TaxTab              from './settings/tax-tab'
import InvoiceDefaultsTab  from './settings/invoice-defaults-tab'
import QuoteDefaultsTab    from './settings/quote-defaults-tab'
import BankingTab          from './settings/banking-tab'
import NotificationsTab    from './settings/notifications-tab'
import BillingTab          from './settings/billing-tab'
import AccountantTab       from './settings/accountant-tab'
import HmrcTab             from './settings/hmrc-tab'
import DangerZoneTab       from './settings/danger-zone-tab'
import { sectionTitle } from '@/lib/typography'

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: 'Free',   color: 'bg-surface-sunken text-text-primary' },
  solo:   { label: 'Solo',   color: 'bg-forest-50 text-forest-600' },
  pro:    { label: 'Pro',    color: 'bg-success-50 text-success-700' },
  studio: { label: 'Studio', color: 'bg-forest-50 text-forest-700' },
}

interface Props {
  profile: User
  email: string
  embedded?: boolean
  initialTab?: SettingsTab
}

export default function SettingsForm({ profile, email, embedded, initialTab }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<SettingsTab>(() => {
    if (initialTab) return initialTab
    const t = searchParams.get('tab')
    if (!t) return 'Profile'
    const decoded = decodeURIComponent(t.replace(/\+/g, ' '))
    const match = TABS.find(name => name.toLowerCase() === decoded.toLowerCase())
    return match ?? 'Profile'
  })

  const [saving, setSaving] = useState(false)

  const displayName = profile?.full_name || email.split('@')[0] || 'You'
  const initials    = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const plan        = (profile?.subscription_plan as string) ?? 'free'
  const planMeta    = PLAN_LABELS[plan] ?? PLAN_LABELS.free

  async function save(data: Record<string, any>) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('users').update(data).eq('id', user.id)
      if (error) throw error
      track(user.id, Events.PROFILE_UPDATED, { tab })
      toast('Settings saved')
      router.refresh()
    } catch {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-10">
      {/* Sidebar nav */}
      <nav className="w-full lg:w-44 flex-shrink-0">
        <div className="space-y-6">
          {TAB_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-micro font-semibold text-text-muted px-2 mb-1.5 tracking-wide">
                {group.label}
              </p>
              <div className="space-y-px">
                {group.tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`relative w-full text-left pl-3 pr-2 py-1.5 text-sm transition-colors ${
                      tab === t
                        ? t === 'Danger Zone'
                          ? 'text-danger-600 font-semibold'
                          : 'text-text-primary font-semibold'
                        : t === 'Danger Zone'
                        ? 'text-danger-500 hover:text-danger-600'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {tab === t && t !== 'Danger Zone' && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded-full bg-brand-primary" />
                    )}
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={async () => {
            const supabase = createClient()
            track(profile.id, Events.USER_LOGGED_OUT)
            await supabase.auth.signOut()
            router.push('/auth/login')
            router.refresh()
          }}
          className="lg:hidden mt-4 w-full text-left px-3 py-2 rounded-xl text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-[640px]">
        <div className={embedded ? '' : 'bg-surface-card border border-border-default rounded-2xl overflow-hidden'}>
          {/* Tab header */}
          <div className={embedded ? 'pb-4 mb-2 border-b border-border-subtle' : 'px-7 py-5 border-b border-border-subtle'}>
            <h2 className={sectionTitle}>{tab}</h2>
            <p className="text-xs text-text-secondary mt-1">{TAB_DESCRIPTIONS[tab]}</p>
          </div>

          <div className={embedded ? 'pt-4' : 'px-7 py-6'}>
            {tab === 'Profile'             && <ProfileTab         profile={profile} email={email} save={save} saving={saving} />}
        {tab === 'Business details'    && <BusinessTab        profile={profile} save={save} saving={saving} />}
        {tab === 'Personal tax inputs' && <TaxTab             profile={profile} save={save} saving={saving} />}
        {tab === 'Invoice Defaults'    && <InvoiceDefaultsTab profile={profile} save={save} saving={saving} />}
        {tab === 'Quote Defaults'      && <QuoteDefaultsTab   profile={profile} save={save} saving={saving} />}
        {tab === 'Banking'             && <BankingTab         profile={profile} save={save} saving={saving} />}
        {tab === 'Notifications'       && <NotificationsTab profile={profile} save={save} saving={saving} />}
        {tab === 'Billing'             && (
          <Suspense fallback={<div />}>
            <BillingTab profile={profile} />
          </Suspense>
        )}
        {tab === 'Accountant Access'   && <AccountantTab />}
        {tab === 'HMRC'               && <Suspense fallback={null}><HmrcTab /></Suspense>}
            {tab === 'Danger Zone'         && <DangerZoneTab />}
          </div>
        </div>
      </div>
    </div>
  )
}
