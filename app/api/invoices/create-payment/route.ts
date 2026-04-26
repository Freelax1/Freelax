import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const { token } = await req.json()

  // Use service role to fetch invoice without auth (public endpoint)
  const supabase = createServiceClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, users(*), clients(*)')
    .eq('public_token', token)
    .single()

  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  if (invoice.status === 'paid') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

  const sender = (invoice as any).users
  const client = (invoice as any).clients

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: client?.email ?? undefined,
      line_items: [{
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(Number(invoice.total) * 100),
          product_data: {
            name: `Invoice ${invoice.invoice_number}`,
            description: `Payment to ${sender?.business_name || sender?.full_name || 'Freelax user'}`,
          },
        },
        quantity: 1,
      }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/inv/${token}?paid=true`,
      cancel_url:  `${process.env.NEXT_PUBLIC_APP_URL}/inv/${token}`,
      metadata: { invoice_id: invoice.id, token },
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe payment error:', e)
    return NextResponse.json({ error: 'Failed to create payment session' }, { status: 500 })
  }
}
