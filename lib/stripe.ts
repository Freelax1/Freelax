export const PLANS = {
  solo: {
    name: 'Solo',
    price_monthly: 1200,
    price_annual: 9900,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || 'price_solo_monthly',
    stripe_price_id_annual: process.env.STRIPE_PRICE_SOLO_ANNUAL || 'price_solo_annual',
    limits: {
      clients: 3,
      projects: 5,
      invoices_per_month: 10,
      ai_calls_per_month: 10,
    },
  },
  pro: {
    name: 'Pro',
    price_monthly: 2900,
    price_annual: 18900,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripe_price_id_annual: process.env.STRIPE_PRICE_PRO_ANNUAL || 'price_pro_annual',
    limits: {
      clients: -1,
      projects: -1,
      invoices_per_month: -1,
      ai_calls_per_month: 100,
    },
  },
  studio: {
    name: 'Studio',
    price_monthly: 4900,
    price_annual: 34900,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || 'price_studio_monthly',
    stripe_price_id_annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL || 'price_studio_annual',
    limits: {
      clients: -1,
      projects: -1,
      invoices_per_month: -1,
      ai_calls_per_month: 500,
      seats: 3,
    },
  },
} as const

export type PlanKey = keyof typeof PLANS

export function getPlanLabel(plan: string): string {
  if (plan === 'free') return 'Free'
  return PLANS[plan as PlanKey]?.name ?? 'Free'
}

export function getPlanPrice(plan: PlanKey, billing: 'monthly' | 'annual'): number {
  return billing === 'monthly'
    ? PLANS[plan].price_monthly
    : PLANS[plan].price_annual
}
