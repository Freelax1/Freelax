'use client'

import { useState, useEffect } from 'react'
import { X } from '@phosphor-icons/react'
import { IconButton } from '@/components/ui/icon-button'
import { SettingsFormSkeleton } from '@/components/ui/content-skeletons'
import { createClient } from '@/lib/supabase/client'
import SettingsForm from '@/components/settings-form'
import type { User } from '@/types/database'

interface Props {
  open:        boolean
  onClose:     () => void
  initialTab?: import('./settings/shared').SettingsTab
}

export default function SettingsModal({ open, onClose, initialTab }: Props) {
  const [profile, setProfile] = useState<User | null>(null)
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.id) {
        setEmail(user.email ?? '')
        const { data } = await supabase.from('users').select('*').eq('id', user.id).single()
        setProfile(data)
      }
      setLoading(false)
    }
    load()
  }, [open])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-modal flex items-center justify-center p-6 bg-black/45"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-surface-card rounded-2xl shadow-2xl flex flex-col"
        style={{
          width: '100%', maxWidth: 1000,
          height: '88vh', maxHeight: 760,
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-default flex-shrink-0">
          <h2 className="text-base font-semibold text-text-primary tracking-tight">Settings</h2>
          <IconButton label="Close" onClick={onClose} icon={<X weight="regular" className="w-4 h-4" />} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading || !profile ? (
            <SettingsFormSkeleton />
          ) : (
            <SettingsForm profile={profile} email={email} embedded initialTab={initialTab} />
          )}
        </div>
      </div>
    </div>
  )
}
