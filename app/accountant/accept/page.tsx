'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, CircleNotch, Warning } from '@phosphor-icons/react'
import { buttonVariants } from '@/components/ui/button'

function AcceptInviteContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [ownerName, setOwnerName] = useState('')
  const [viewUrl, setViewUrl] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); return }
    fetch('/api/accountant/accept', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) { setOwnerName(data.ownerName); setViewUrl(data.viewUrl); setStatus('success') }
        else setStatus('error')
      })
      .catch(() => setStatus('error'))
  }, [token])

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-paper font-sans">
      <div className="bg-surface-card rounded-xl border border-border-default p-10 max-w-[420px] w-full text-center">
        <p className="text-2xl font-serif mb-6 text-text-primary">Freelax</p>
        {status === 'loading' && <CircleNotch weight="regular" className="w-8 h-8 mx-auto text-text-secondary animate-spin" />}
        {status === 'success' && (
          <>
            <CheckCircle weight="regular" className="w-10 h-10 mx-auto mb-4 text-success-600" />
            <h1 className="text-xl font-semibold mb-2 text-text-primary">Invitation accepted</h1>
            <p className="text-sm mb-6 text-text-secondary">You now have read-only access to <strong>{ownerName}</strong>'s Freelax account.</p>
            <a href={viewUrl} className={buttonVariants({ intent: 'primary', size: 'md' })}>
              View account
            </a>
          </>
        )}
        {status === 'error' && (
          <>
            <Warning weight="regular" className="w-10 h-10 mx-auto mb-4 text-danger-500" />
            <h1 className="text-xl font-semibold mb-2 text-text-primary">Invalid invite</h1>
            <p className="text-sm text-text-secondary">This invitation link has expired, been revoked, or already been used.</p>
          </>
        )}
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-surface-paper">
        <CircleNotch weight="regular" className="w-8 h-8 text-text-secondary animate-spin" />
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
