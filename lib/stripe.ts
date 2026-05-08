export const PLANS = {
  solo: {
    name: 'Solo',
    price_monthly: 900,
    price_annual: 7900,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_SOLO_MONTHLY || 'price_solo_monthly',
    stripe_price_id_annual:  process.env.STRIPE_PRICE_SOLO_ANNUAL  || 'price_solo_annual',
  },
  pro: {
    name: 'Pro',
    price_monthly: 1900,
    price_annual: 15900,
    stripe_price_id_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_monthly',
    stripe_price_id_annual:  process.env.STRIPE_PRICE_PRO_ANNUAL  || 'price_pro_annual',
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
