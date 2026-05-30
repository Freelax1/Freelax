import type { Metadata, Viewport } from 'next'
import './globals.css'
import { PostHogProvider } from '@/components/posthog-provider'
import { PostHogPageView } from '@/components/posthog-pageview'

export const metadata: Metadata = {
  title: 'Freelax — Tax & invoicing for UK freelancers',
  description: 'Financial control for UK freelancers. Tax estimates, invoicing, expenses, IR35.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Freelax',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#1D6B35',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Freelax" />
      </head>
      <body>
        <PostHogProvider>
          <PostHogPageView />
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
