'use client'

import { useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { TABS, SettingsTab } from './settings/shared'
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
