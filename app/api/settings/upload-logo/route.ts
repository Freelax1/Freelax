import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Detect actual image type from file content, ignoring browser-supplied MIME.
function detectImageMimeType(buf: Uint8Array): string | null {
  // JPEG: FF D8 FF
  if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47 &&
      buf[4] === 0x0D && buf[5] === 0x0A && buf[6] === 0x1A && buf[7] === 0x0A) return 'image/png'
  // WebP: "RIFF" at 0-3, "WEBP" at 8-11
  if (buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
      buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return 'image/webp'
  // SVG is text-based — look for XML/SVG opening tags in the first 256 bytes
  const text = new TextDecoder('utf-8', { fatal: false }).decode(buf.slice(0, 256))
  if (/^<\?xml[\s>]|^<svg[\s>]/i.test(text.trimStart()) || /<svg[\s>]/i.test(text)) return 'image/svg+xml'
  return null
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: 'File must be under 2 MB' }, { status: 400 })
  }

  const rawBytes  = await file.arrayBuffer()
  const headerBuf = new Uint8Array(rawBytes, 0, Math.min(rawBytes.byteLength, 12))
  const detectedType = detectImageMimeType(headerBuf)

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!detectedType || !allowed.includes(detectedType)) {
    return NextResponse.json({ error: 'Only JPEG, PNG, WebP or SVG allowed' }, { status: 400 })
  }

  const extMap: Record<string, string> = {
    'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/svg+xml': 'svg',
  }
  const ext  = extMap[detectedType]
  const path = `logos/${user.id}.${ext}`
  const bytes = rawBytes

  const { error: uploadError } = await supabase.storage
    .from('receipts')
    .upload(path, bytes, { contentType: detectedType, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)

  await supabase
    .from('users')
    .update({ logo_url: publicUrl, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  return NextResponse.json({ url: publicUrl })
}
