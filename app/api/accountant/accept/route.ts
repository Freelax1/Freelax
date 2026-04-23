import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { token } = await req.json()

  const { data: invite } = await supabase
    .from('accountant_invites')
    .select('*, users!owner_id(id, business_name, full_name)')
    .eq('token', token)
    .is('revoked_at', null)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Already accepted' }, { status: 400 })

  await supabase.from('accountant_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id)

  return NextResponse.json({
    success: true,
    ownerId: invite.owner_id,
    ownerName: (invite as any).users?.business_name || (invite as any).users?.full_name,
    viewUrl: `${process.env.NEXT_PUBLIC_APP_URL}/accountant/view/${invite.owner_id}`,
  })
}
