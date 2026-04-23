import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_INVOICE_WEBHOOK_SECRET!)
  } catch (e) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const invoiceId = session.metadata?.invoice_id
    if (invoiceId && session.payment_status === 'paid') {
      const supabase = createClient()
      await supabase.from('invoices').update({
        status: 'paid',
        paid_date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString(),
      }).eq('id', invoiceId)
    }
  }

  return NextResponse.json({ received: true })
}
