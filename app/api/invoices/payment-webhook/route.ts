import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'

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
    const expectedUserId = session.metadata?.user_id
    if (invoiceId && session.payment_status === 'paid') {
      const supabase = createServiceClient()
      // Verify the invoice exists and belongs to the user recorded in session metadata
      const { data: invoice } = await supabase
        .from('invoices')
        .select('user_id, status')
        .eq('id', invoiceId)
        .single()
      if (!invoice || invoice.user_id !== expectedUserId) {
        console.error('Stripe webhook: invoice ownership mismatch', { invoiceId, expectedUserId })
        return NextResponse.json({ received: true })
      }
      if (invoice.status !== 'paid') {
        await supabase.from('invoices').update({
          status: 'paid',
          paid_date: new Date().toISOString().slice(0, 10),
          updated_at: new Date().toISOString(),
        }).eq('id', invoiceId)
      }
    }
  }

  return NextResponse.json({ received: true })
}
