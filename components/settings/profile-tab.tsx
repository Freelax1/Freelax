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
    <div className="space-y-5">
      {/* Logo upload */}
      <div>
        <label className={labelClass}>Business logo</label>
        <p className="text-xs text-slate-400 mb-3">Appears on all invoices and quotes sent to clients.</p>
        <div className="flex items-start gap-5">

          {/* Preview */}
          <div
            className="relative flex-shrink-0 w-16 h-16 rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden group cursor-pointer hover:border-slate-300 hover:bg-slate-100 transition-all"
            onClick={() => !logoUploading && fileRef.current?.click()}
          >
            {logoUrl ? (
              <>
                <img src={logoUrl} alt="Business logo" className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-lg">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </>
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#1D6B35] flex items-center justify-center text-white font-bold text-xs">
                {(profile?.business_name || profile?.full_name || 'F').slice(0, 2).toUpperCase()}
              </div>
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg">
                <svg className="animate-spin w-5 h-5 text-slate-400" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2"/>
                  <path d="M12 3a9 9 0 0 1 9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-1 space-y-2">
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
              className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all font-medium"
            >
              <Upload className="w-3.5 h-3.5" />
              {logoUploading ? 'Uploading…' : logoUrl ? 'Replace logo' : 'Upload logo'}
            </button>
            {logoUrl && (
              <button
                onClick={removeLogo}
                className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
              >
                <X className="w-3.5 h-3.5" />
                Remove
              </button>
            )}
            <p className="text-xs text-slate-400 leading-relaxed">
              PNG, JPG or SVG · max 2 MB<br/>
              Recommended: 400×400px, transparent background
            </p>
            {logoError && (
              <p className="text-xs text-red-500">{logoError}</p>
            )}
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
      <div className="flex">
        <button className={btnClass} disabled={saving} onClick={() => save(pf)}>
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </div>
    </div>
  )
}
