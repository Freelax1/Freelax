'use client'
export const dynamic = 'force-dynamic'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, Loader2, AlertTriangle } from 'lucide-react'

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
    <div style={{ minHeight: '100vh', background: '#F6F6F6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8E8E8', padding: 40, maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <p style={{ fontSize: 24, fontWeight: 800, color: '#111', marginBottom: 24 }}>Freelax</p>
        {status === 'loading' && <Loader2 style={{ width: 32, height: 32, color: '#475569', margin: '0 auto', animation: 'spin 1s linear infinite' }} />}
        {status === 'success' && (
          <>
            <CheckCircle style={{ width: 40, height: 40, color: '#1D6B35', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>Invitation accepted</h1>
            <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>You now have read-only access to <strong>{ownerName}</strong>'s Freelax account.</p>
            <a href={viewUrl} style={{ display: 'inline-block', background: '#111', color: '#fff', padding: '12px 24px', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
              View account
            </a>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertTriangle style={{ width: 40, height: 40, color: '#C0392B', margin: '0 auto 16px' }} />
            <h1 style={{ fontSize: 20, fontWeight: 700, color: '#111', marginBottom: 8 }}>Invalid invite</h1>
            <p style={{ fontSize: 14, color: '#64748B' }}>This invitation link has expired, been revoked, or already been used.</p>
          </>
        )}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#F6F6F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: 32, height: 32, color: '#475569', animation: 'spin 1s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    }>
      <AcceptInviteContent />
    </Suspense>
  )
}
