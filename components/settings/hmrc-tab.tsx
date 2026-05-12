'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function HmrcTab() {
  const searchParams                        = useSearchParams()
  const [connected, setConnected]           = useState(false)
  const [loading, setLoading]               = useState(true)
  const [disconnecting, setDisconnecting]   = useState(false)
  const [message, setMessage]               = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Show success/error from OAuth callback redirect
  useEffect(() => {
    if (searchParams.get('hmrc_connected') === 'true') {
      setMessage({ type: 'success', text: 'HMRC account connected successfully.' })
    } else if (searchParams.get('hmrc_error')) {
      const err = searchParams.get('hmrc_error')
      setMessage({ type: 'error', text: `Connection failed: ${err?.replace(/_/g, ' ')}. Please try again.` })
    }
  }, [searchParams])

  useEffect(() => {
    let isMounted = true
    async function checkConnection() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { if (isMounted) setLoading(false); return }
        const { data } = await supabase
          .from('oauth_connections')
          .select('id')
          .eq('provider', 'hmrc')
          .eq('user_id', user.id)
          .maybeSingle()
        if (isMounted) setConnected(!!data)
      } catch {}
      if (isMounted) setLoading(false)
    }
    checkConnection()
    return () => { isMounted = false }
  }, [])

  async function handleDisconnect() {
    setDisconnecting(true)
    try {
      const res = await fetch('/api/auth/hmrc', { method: 'DELETE' })
      if (res.ok) {
        setConnected(false)
        setMessage({ type: 'success', text: 'HMRC account disconnected.' })
      } else {
        setMessage({ type: 'error', text: 'Could not disconnect. Please try again.' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Could not disconnect. Please try again.' })
    }
    setDisconnecting(false)
  }

  return (
    <div className="space-y-5">

      {/* Header card */}
      <div className="space-y-5 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
        <div>
          <p className="text-sm text-slate-500">
            Connect your HMRC account to submit Making Tax Digital (MTD) returns directly from Freelax.
          </p>
        </div>

        {/* Callback message banner */}
        {message && (
          <div className={`text-sm px-4 py-3 rounded-lg border ${
            message.type === 'success'
              ? 'bg-green-50 border-green-200 text-green-700'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Connection status */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
          <div>
            <p className="text-sm text-slate-500 mb-0.5">Connection status</p>
            {loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                <span className="text-sm text-slate-600">Checking…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-slate-300'}`} />
                <span className={`text-sm font-medium ${connected ? 'text-green-700' : 'text-slate-600'}`}>
                  {connected ? 'Connected to HMRC' : 'Not connected'}
                </span>
              </div>
            )}
          </div>

          {connected ? (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 transition-colors"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href="/api/auth/hmrc"
              className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
            >
              Connect to HMRC
            </a>
          )}
        </div>
      </div>

      {/* What is MTD explainer */}
      <div className="space-y-5 pb-6 border-b border-slate-100 last:border-0 last:pb-0">
        <h3 className="font-semibold text-slate-900">What is Making Tax Digital?</h3>
        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            Making Tax Digital (MTD) is HMRC's programme to move UK tax records and submissions entirely online. Since April 2026, sole traders and landlords earning over £50,000 are legally required to submit quarterly income and expense updates to HMRC using approved software.
          </p>
          <p>
            Connecting your HMRC account will allow Freelax to submit your quarterly MTD updates and VAT returns directly to HMRC — without you needing to log in to the HMRC portal separately.
          </p>
        </div>

        {/* MTD timeline */}
        <div className="border border-slate-100 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-100">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">MTD rollout</p>
          </div>
          {[
            { date: 'April 2026', desc: 'Sole traders / landlords with income over £50,000', status: 'live' },
            { date: 'April 2027', desc: 'Sole traders / landlords with income over £30,000', status: 'upcoming' },
            { date: 'TBC',        desc: 'Income over £20,000 (threshold under review)',        status: 'tbc' },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-4 px-4 py-3 border-b border-slate-100 last:border-0">
              <div className="shrink-0 pt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  row.status === 'live'     ? 'bg-green-100 text-green-700' :
                  row.status === 'upcoming' ? 'bg-amber-100 text-amber-800' :
                                              'bg-slate-100 text-slate-700'
                }`}>
                  {row.date}
                </span>
              </div>
              <p className="text-sm text-slate-600">{row.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What you'll be able to do */}
      <div className="bg-slate-50 rounded-xl border border-slate-100 p-5">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Once connected, Freelax will</p>
        <ul className="space-y-2">
          {[
            'Submit your quarterly income and expense updates to HMRC automatically',
            'Prepare and submit your VAT returns for VAT-registered businesses',
            'Track submission status — draft, submitted, accepted, or amendment required',
            'Send you deadline reminders 7 days and 1 day before each quarter closes',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
              <span className="text-slate-600 mt-0.5 shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
