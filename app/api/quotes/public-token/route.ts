import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { randomBytes } from 'crypto'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { quoteId } = await req.json()

  const { data: quote } = await supabase
    .from('quotes').select('user_id, public_token').eq('id', quoteId).single()
  if (!quote || quote.user_id !== user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const token = quote.public_token ?? randomBytes(20).toString('hex')
  if (!quote.public_token) {
    await supabase.from('quotes').update({ public_token: token }).eq('id', quoteId)
  }

  const url = `${process.env.NEXT_PUBLIC_APP_URL}/q/${token}`
  return NextResponse.json({ token, url })
}
