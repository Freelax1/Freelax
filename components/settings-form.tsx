'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TABS, TAB_GROUPS, TAB_DESCRIPTIONS, SettingsTab } from './settings/shared'
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

const PLAN_LABELS: Record<string, { label: string; color: string }> = {
  free:   { label: 'Free',   color: 'bg-slate-100 text-slate-700' },
  solo:   { label: 'Solo',   color: 'bg-blue-50 text-blue-600' },
  pro:    { label: 'Pro',    color: 'bg-green-50 text-green-700' },
  studio: { label: 'Studio', color: 'bg-purple-50 text-purple-700' },
}

interface Props {
  profile: User
  email: string
}

export default function SettingsForm({ profile, email }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [tab, setTab] = useState<SettingsTab>(() => {
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
      toast('Settings saved')
      router.refresh()
    } catch {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar nav */}
      <nav className="w-full lg:w-52 flex-shrink-0 lg:bg-[#F0F0EB] lg:rounded-xl lg:p-4">

        {/* Identity block */}
        <div className="flex items-center gap-3 px-3 py-3 mb-4 border-b border-slate-100">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: '#1D6B35' }}>
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900 truncate">{displayName}</p>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded mt-0.5 ${planMeta.color}`}>
              {planMeta.label}
            </span>
          </div>
        </div>

        <div className="space-y-5">
          {TAB_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={tab === t && t !== 'Danger Zone' ? { borderLeft: '2px solid #1D6B35' } : { borderLeft: '2px solid transparent' }}
                    className={`w-full text-left px-3 py-2 text-sm transition-all ${
                      tab === t
                        ? t === 'Danger Zone'
                          ? 'text-red-600 font-medium bg-red-50 rounded-lg'
                          : 'text-slate-900 font-medium bg-slate-50 rounded-r-lg'
                        : t === 'Danger Zone'
                        ? 'text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg'
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-lg'
                    }`}
                  >
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
            await supabase.auth.signOut()
            router.push('/auth/login')
            router.refresh()
          }}
          className="lg:hidden mt-4 w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          Sign out
        </button>
      </nav>

      {/* Content */}
      <div className="flex-1 min-w-0 max-w-[580px] space-y-4">
        {/* Tab header */}
        <div className="mb-2">
          <h1 className="text-base font-bold text-slate-900">{tab}</h1>
          <p className="text-sm text-slate-500 mt-0.5">{TAB_DESCRIPTIONS[tab]}</p>
        </div>

        {tab === 'Profile'             && <ProfileTab         profile={profile} email={email} save={save} saving={saving} />}
        {tab === 'Business details'    && <BusinessTab        profile={profile} save={save} saving={saving} />}
        {tab === 'Personal tax inputs' && <TaxTab             profile={profile} save={save} saving={saving} />}
        {tab === 'Invoice Defaults'    && <InvoiceDefaultsTab profile={profile} save={save} saving={saving} />}
        {tab === 'Quote Defaults'      && <QuoteDefaultsTab   profile={profile} save={save} saving={saving} />}
        {tab === 'Banking'             && <BankingTab         profile={profile} save={save} saving={saving} />}
        {tab === 'Notifications'       && <NotificationsTab />}
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
  )
}
