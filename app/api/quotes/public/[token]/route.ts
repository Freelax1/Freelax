// Public read-only quote fetch by token. The /q/[token] page queries Supabase
// directly (server component); this route exists for any future non-server-component
// consumer (mobile client, third-party integration, etc.).
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
    console.log('[quotes/public] DIAGNOSTIC', {
      token: params.token,
      hasQuote: !!quote,
      error: error ? { message: error.message, code: error.code, details: error.details, hint: error.hint } : null,
      supabaseUrlPresent: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      serviceKeyPresent: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    })
    return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
  }

  return NextResponse.json(quote)
}
