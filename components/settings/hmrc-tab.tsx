'use client'

import Button, { buttonVariants } from '@/components/ui/button'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CircleNotch } from '@phosphor-icons/react'

const SANDBOX_MODE = process.env.NEXT_PUBLIC_HMRC_SANDBOX_MODE === 'true'

export default function HmrcTab() {
  const searchParams                        = useSearchParams()
  const [connected, setConnected]           = useState(false)
  const [loading, setLoading]               = useState(true)
  const [disconnecting, setDisconnecting]   = useState(false)
  const [message, setMessage]               = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testLoading, setTestLoading]       = useState(false)
  const [testResult, setTestResult]         = useState<string | null>(null)

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

  async function handleTestConnection() {
    setTestLoading(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/hmrc/test-connection')
      const data = await res.json()
      setTestResult(JSON.stringify(data, null, 2))
    } catch (e) {
      setTestResult(String(e))
    }
    setTestLoading(false)
  }

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
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <div>
          <p className="text-sm text-text-muted">
            Connect your HMRC account to submit Making Tax Digital (MTD) returns directly from Freelax.
          </p>
        </div>

        {/* Callback message banner */}
        {message && (
          <div className={`text-sm px-4 py-3 rounded-xl border ${
            message.type === 'success'
              ? 'bg-success-50 border-success-200 text-success-700'
              : 'bg-danger-50 border-danger-200 text-danger-700'
          }`}>
            {message.text}
          </div>
        )}

        {/* Connection status */}
        <div className="flex items-center justify-between p-4 bg-surface-sunken rounded-xl border border-border-subtle">
          <div>
            <p className="text-sm text-text-muted mb-0.5">Connection status</p>
            {loading ? (
              <div className="flex items-center gap-2">
                <CircleNotch weight="regular" className="w-3.5 h-3.5 animate-spin text-text-secondary" />
                <span className="text-sm text-text-secondary">Checking…</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${connected ? 'bg-success-500' : 'bg-border-strong'}`} />
                <span className={`text-sm font-medium ${connected ? 'text-success-700' : 'text-text-secondary'}`}>
                  {connected ? 'Connected to HMRC' : 'Not connected'}
                </span>
              </div>
            )}
          </div>

          {connected ? (
            <Button
              type="button"
              intent="danger-subtle"
              size="sm"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          ) : (
            <a href="/api/auth/hmrc" className={buttonVariants({ intent: 'primary', size: 'sm' })}>
              Connect to HMRC
            </a>
          )}
        </div>


        {/* Sandbox: test connection button */}
        {SANDBOX_MODE && connected && (
          <div className="space-y-2">
            <Button
              type="button"
              intent="secondary"
              size="sm"
              onClick={handleTestConnection}
              disabled={testLoading}
            >
              {testLoading && <CircleNotch weight="regular" className="w-3.5 h-3.5 animate-spin" />}
              {testLoading ? 'Testing…' : 'Test connection (sandbox)'}
            </Button>
            {testResult && (
              <pre className="text-xs bg-surface-sunken text-text-secondary border border-border-default rounded-xl p-3 overflow-auto max-h-64 whitespace-pre-wrap break-all">
                {testResult}
              </pre>
            )}
          </div>
        )}
      </div>

      {/* What is MTD explainer */}
      <div className="space-y-5 pb-6 border-b border-border-subtle last:border-0 last:pb-0">
        <h3 className="font-semibold text-text-primary">What is Making Tax Digital?</h3>
        <div className="space-y-3 text-sm text-text-secondary leading-relaxed">
          <p>
            Making Tax Digital (MTD) is HMRC's programme to move UK tax records and submissions entirely online. Since April 2026, sole traders and landlords earning over £50,000 are legally required to submit quarterly income and expense updates to HMRC using approved software.
          </p>
          <p>
            Connecting your HMRC account will allow Freelax to submit your quarterly MTD updates and VAT returns directly to HMRC — without you needing to log in to the HMRC portal separately.
          </p>
        </div>

        {/* MTD timeline */}
        <div className="border border-border-subtle rounded-xl overflow-hidden">
          <div className="bg-surface-sunken px-4 py-2.5 border-b border-border-subtle">
            <p className="text-xs font-semibold text-text-muted">MTD rollout</p>
          </div>
          {[
            { date: 'April 2026', desc: 'Sole traders / landlords with income over £50,000', status: 'live' },
            { date: 'April 2027', desc: 'Sole traders / landlords with income over £30,000', status: 'upcoming' },
            { date: 'TBC',        desc: 'Income over £20,000 (threshold under review)',        status: 'tbc' },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-4 px-4 py-3 border-b border-border-subtle last:border-0">
              <div className="shrink-0 pt-0.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                  row.status === 'live'     ? 'bg-success-100 text-success-700' :
                  row.status === 'upcoming' ? 'bg-warning-100 text-warning-800' :
                                              'bg-surface-sunken text-text-secondary'
                }`}>
                  {row.date}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{row.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* What you'll be able to do */}
      <div className="bg-surface-sunken rounded-xl border border-border-subtle p-5">
        <p className="text-xs font-semibold text-text-muted mb-3">Once connected, Freelax will</p>
        <ul className="space-y-2">
          {[
            'Submit your quarterly income and expense updates to HMRC automatically',
            'Prepare and submit your VAT returns for VAT-registered businesses',
            'Track submission status — draft, submitted, accepted, or amendment required',
            'Send you deadline reminders 7 days and 1 day before each quarter closes',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
              <span className="text-text-secondary mt-0.5 shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

    </div>
  )
}
