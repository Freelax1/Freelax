'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TABS, TAB_GROUPS, SettingsTab } from './settings/shared'
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
  const [error,  setError]  = useState<string | null>(null)

  async function save(data: Record<string, any>) {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase.from('users').update(data).eq('id', user.id)
      if (error) throw error
      toast('Settings saved')
    } catch {
      toast('Failed to save. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Sidebar nav */}
      <nav className="w-48 flex-shrink-0">
        <div className="space-y-5">
          {TAB_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-1.5">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.tabs.map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      tab === t
                        ? 'bg-slate-900 text-white font-medium'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    } ${t === 'Danger Zone' ? tab !== t ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'bg-red-600 text-white' : ''}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 max-w-xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
            Error: {error}
          </div>
        )}

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
