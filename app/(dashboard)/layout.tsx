import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import TaxQAChat from '@/components/tax-qa-chat'
import { PWAInstallBanner } from '@/components/pwa-install-banner'
import CookieNotice from '@/components/cookie-notice'
import Toaster from '@/components/toaster'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div style={{ background: '#FAFAF7', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ paddingTop: '48px' }}>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto" style={{ paddingBottom: '80px' }}>
          {children}
        </div>
      </main>
      <TaxQAChat />
      <PWAInstallBanner />
      <CookieNotice />
      <Toaster />
    </div>
  )
}
