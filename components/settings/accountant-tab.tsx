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
        <p className="text-sm text-slate-500 mb-4">
          Invite your accountant to view your Freelax data in read-only mode. They can see invoices, expenses, and tax summaries but cannot make any changes.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            placeholder="accountant@example.com"
            value={acctEmail}
            onChange={e => setAcctEmail(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            onClick={sendAccountantInvite}
            disabled={acctSending || !acctEmail.trim()}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 disabled:opacity-50 whitespace-nowrap"
          >
            {acctSending ? 'Sending…' : 'Send invite'}
          </button>
        </div>
        {acctMsg && (
          <p className={`text-sm mt-2 ${acctMsg.includes('success') ? 'text-green-700' : 'text-red-600'}`}>{acctMsg}</p>
        )}
      </div>
      {acctInvites.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Active invites</p>
          <div className="space-y-2">
            {acctInvites.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <p className="text-sm font-medium text-slate-800">{inv.email}</p>
                  <p className="text-xs text-slate-600 mt-0.5">
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
                    className="text-xs text-red-500 hover:text-red-700 font-medium"
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
