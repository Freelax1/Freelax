import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const supabase = createServiceClient()

  const { data: quote, error } = await supabase
    .from('quotes')
    .select('*, clients(*), quote_line_items(*), users(business_name, full_name, email, logo_url, address_line1, city)')
    .eq('public_token', params.token)
    .single()

  if (!quote || error) {
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json(quote)
}
