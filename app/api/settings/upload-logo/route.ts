import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or SVG allowed' }, { status: 400 })
  }
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'png'
  const path = `logos/${user.id}.${ext}`
  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, bytes, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)

  await supabase
    .from('users')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ url: publicUrl })
}
