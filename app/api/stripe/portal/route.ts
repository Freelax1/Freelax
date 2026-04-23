// app/api/stripe/portal/route.ts
// Creates a Stripe Customer Portal session so users can manage,
// cancel, or change their subscription directly through Stripe.

import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' })

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 })

  const { data: userData } = await supabase
    .from('users')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!userData?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No active subscription found' },
      { status: 400 }
    )
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: userData.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('Stripe portal error:', e)
    return NextResponse.json({ error: 'Failed to open billing portal' }, { status: 500 })
  }
}
