import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/server'
import { Events } from '@/lib/posthog-events'
import { trackServer } from '@/lib/posthog-server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    console.error('Webhook signature error:', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const userId = session.metadata?.user_id
      const plan = session.metadata?.plan
      if (!userId || !plan) break

      await supabase.from('users').update({
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
        subscription_plan: plan,
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('id', userId)
      await trackServer(userId, Events.SUBSCRIPTION_ACTIVATED, { plan })
      break
    }

    case 'invoice.paid': {
      const inv = event.data.object as Stripe.Invoice
      const customerId = inv.customer as string
      const { data: u } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single()
      await supabase.from('users').update({
        subscription_status: 'active',
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', customerId)
      if (u?.id) await trackServer(u.id, Events.SUBSCRIPTION_ACTIVATED, { source: 'invoice.paid' })
      break
    }

    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice
      const customerId = inv.customer as string
      const { data: u } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single()
      await supabase.from('users').update({
        subscription_status: 'past_due',
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', customerId)
      if (u?.id) await trackServer(u.id, Events.SUBSCRIPTION_PAYMENT_FAILED)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string
      const { data: u } = await supabase.from('users').select('id').eq('stripe_customer_id', customerId).single()
      await supabase.from('users').update({
        subscription_plan: 'free',
        subscription_status: 'active',
        stripe_subscription_id: null,
        updated_at: new Date().toISOString(),
      }).eq('stripe_customer_id', customerId)
      if (u?.id) await trackServer(u.id, Events.SUBSCRIPTION_CANCELLED)
      break
    }
  }

  return NextResponse.json({ received: true })
}
