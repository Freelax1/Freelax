'use client'

import { useState, useEffect } from 'react'
import { inputClass } from './shared'

export default function AccountantTab() {
  const [acctEmail, setAcctEmail]     = useState('')
  const [acctInvites, setAcctInvites] = useState<any[]>([])
  const [acctSending, setAcctSending] = useState(false)
  const [acctMsg, setAcctMsg]         = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
  }, [])

  async function sendAccountantInvite() {
    if (!acctEmail.trim()) return
    setAcctSending(true)
    const res  = await fetch('/api/accountant/invite', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acctEmail.trim() }),
    })
    const data = await res.json()
    if (data.success) {
      setAcctMsg('Invite sent successfully')
      setAcctEmail('')
      fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
    } else {
      setAcctMsg(data.error ?? 'Failed to send invite')
    }
    setAcctSending(false)
    setTimeout(() => setAcctMsg(null), 4000)
  }

  async function revokeAccountantInvite(id: string) {
    await fetch('/api/accountant/invite', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    fetch('/api/accountant/invite').then(r => r.json()).then(d => setAcctInvites(d.invites ?? []))
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-text-muted mb-4">
          Invite your accountant to view your Freelax data in read-only mode. They can see invoices, expenses, and tax summaries but cannot make any changes.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="accountant@example.com"
            value={acctEmail}
            onChange={e => setAcctEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-border-default rounded-md text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/20"
          />
          <button
            onClick={sendAccountantInvite}
            disabled={acctSending || !acctEmail.trim()}
            className="px-4 py-2 bg-forest-900 text-white rounded-xl text-sm font-medium hover:bg-forest-900 disabled:opacity-50 whitespace-nowrap"
          >
            {acctSending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {acctMsg && (
          <p className={`text-sm mt-2 ${acctMsg.includes('success') ? 'text-success-700' : 'text-danger-600'}`}>{acctMsg}</p>
        )}
      </div>
      {acctInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-text-muted mb-3">Active invites</p>
          <div className="space-y-2">
            {acctInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-surface-sunken rounded-xl border border-border-default">
                <div>
                  <p className="text-sm font-medium text-text-primary">{inv.email}</p>
                  <p className="text-xs text-text-secondary mt-0.5">
                    {inv.accepted_at
                      ? `Accepted ${new Date(inv.accepted_at).toLocaleDateString('en-GB')}`
                      : inv.revoked_at
                      ? `Revoked ${new Date(inv.revoked_at).toLocaleDateString('en-GB')}`
                      : `Invited ${new Date(inv.created_at).toLocaleDateString('en-GB')} · Pending`}
                  </p>
                </div>
                {!inv.revoked_at && (
                  <button
                    onClick={() => revokeAccountantInvite(inv.id)}
                    className="text-xs text-danger-500 hover:text-danger-700 font-medium"
                  >
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
