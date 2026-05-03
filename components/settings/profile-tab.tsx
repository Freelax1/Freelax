'use client'

import { useState, useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Field, inputClass, btnClass, labelClass } from './shared'

interface Props {
  profile: any
  email: string
  save: (data: Record<string, any>) => Promise<void>
  saving: boolean
}

export default function ProfileTab({ profile, email, save, saving }: Props) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [logoUrl, setLogoUrl] = useState<string | null>(profile?.logo_url ?? null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [pf, setPf] = useState({ full_name: profile?.full_name ?? '', phone: profile?.phone ?? '' })

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoUploading(true)
    setLogoError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch('/api/settings/upload-logo', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) { setLogoError(json.error ?? 'Upload failed'); return }
      setLogoUrl(json.url)
    } catch {
      setLogoError('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  async function removeLogo() {
    setLogoUrl(null)
    const supabase = createClient()
    await supabase.from('users').update({ logo_url: null, updated_at: new Date().toISOString() }).eq('id', profile.id)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <h2 className="font-semibold text-slate-900">Profile</h2>

      {/* Logo upload */}
      <div>
        <label className={labelClass}>Business logo</label>
        <div className="flex items-center gap-4">
          {logoUrl ? (
            <div className="relative w-16 h-16 rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
              <img src={logoUrl} alt="Logo" className="w-full h-full object-contain p-1" />
              <button
                onClick={removeLogo}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-white rounded-full shadow flex items-center justify-center border border-slate-200 hover:bg-red-50 hover:border-red-200"
              >
                <X className="w-3 h-3 text-slate-500" />
              </button>
            </div>
          ) : (
            <div className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50">
              <Upload className="w-5 h-5 text-slate-300" />
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={logoUploading}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              {logoUploading ? 'Uploading…' : logoUrl ? 'Change logo' : 'Upload logo'}
            </button>
            <p className="text-xs text-slate-400 mt-1">PNG, JPG or SVG · max 2 MB</p>
            {logoError && <p className="text-xs text-red-500 mt-1">{logoError}</p>}
          </div>
        </div>
      </div>

      <Field label="Full name">
        <input className={inputClass} value={pf.full_name} onChange={e => setPf(p => ({ ...p, full_name: e.target.value }))} />
      </Field>
      <Field label="Email">
        <input className={`${inputClass} bg-slate-50 text-slate-400`} value={email} readOnly />
        <p className="text-xs text-slate-400 mt-1">Email cannot be changed here</p>
      </Field>
      <Field label="Phone">
        <input className={inputClass} value={pf.phone} onChange={e => setPf(p => ({ ...p, phone: e.target.value }))} placeholder="07700 000000" />
      </Field>
      <button className={btnClass} disabled={saving} onClick={() => save(pf)}>
        {saving ? 'Saving...' : 'Save profile'}
      </button>
    </div>
  )
}
