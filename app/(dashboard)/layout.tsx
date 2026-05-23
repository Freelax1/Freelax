import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/sidebar'
import TaxQAChat from '@/components/tax-qa-chat'
import { PWAInstallBanner } from '@/components/pwa-install-banner'
import CookieNotice from '@/components/cookie-notice'
import Toaster from '@/components/toaster'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return (
    <div className="bg-surface-paper min-h-screen">
      <Sidebar />
      <main className="lg:pl-[264px] pt-[52px] lg:pt-0">
        <div className="p-6 lg:p-8 max-w-7xl mx-auto pb-[80px]">
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
