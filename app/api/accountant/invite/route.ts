import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/escape-html'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

export async function POST(req: NextRequest) {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return NextResponse.json({ error: 'Email service not configured' }, { status: 503 })
  }
  const resend = new Resend(resendKey)

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Prevent duplicate pending invites to the same email
  const { data: existing } = await supabase
    .from('accountant_invites')
    .select('id')
    .eq('owner_id', user.id)
    .eq('email', email)
    .is('revoked_at', null)
    .is('accepted_at', null)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'A pending invite already exists for this email' }, { status: 409 })
  }

  const { data: invite, error } = await supabase
    .from('accountant_invites')
    .insert({ owner_id: user.id, email })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: owner } = await supabase.from('users').select('full_name, business_name').eq('id', user.id).single()
  const senderName = (owner as any)?.business_name || (owner as any)?.full_name || 'Your client'
  const acceptUrl  = `${process.env.NEXT_PUBLIC_APP_URL}/accountant/accept?token=${invite.token}`

  try {
    await resend.emails.send({
      from:    'Freelax <noreply@freelax.co.uk>',
      to:      email,
      subject: `${senderName} has invited you to view their Freelax account`,
      html:    `<p>Hi,</p>
               <p><strong>${escapeHtml(senderName)}</strong> has invited you to view their Freelax financial data as a read-only accountant.</p>
               <p><a href="${escapeHtml(acceptUrl)}" style="background:#111;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;margin:16px 0">Accept invitation</a></p>
               <p style="color:#888;font-size:12px">This link expires after first use. If you didn't expect this, you can ignore this email.</p>`,
    })
  } catch (e) {
    console.error('Email send failed:', e)
  }

  await trackServer(user.id, Events.ACCOUNTANT_INVITE_SENT, { invite_id: invite.id })
  return NextResponse.json({ success: true, token: invite.token })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data } = await supabase
    .from('accountant_invites')
    .select('id, email, accepted_at, revoked_at, created_at')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  return NextResponse.json({ invites: data ?? [] })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { id } = await req.json()
  await supabase.from('accountant_invites').update({ revoked_at: new Date().toISOString() }).eq('id', id).eq('owner_id', user.id)
  await trackServer(user.id, Events.ACCOUNTANT_INVITE_REVOKED, { invite_id: id })
  return NextResponse.json({ success: true })
}
