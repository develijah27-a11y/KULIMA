// Single source of truth for subscription pricing/validity — the DB no
// longer CHECK-constrains `subscriptions.plan` (see
// 20260727000002_role_scoped_subscriptions.sql) so repricing or adding a
// plan here never needs a migration. Every self-serve plan must debit a
// wallet (personal or, for Group Pro, the group's pooled wallet) — there is
// no separate payment gateway for subscriptions, they spend existing
// balance funded via the regular MoMo deposit flow.
//
// Only the 5 roles the source review actually priced are covered
// (farmer/buyer/transporter/groups/supplier) — pathologist/offtaker are
// deliberately absent until real pricing exists for them, not an oversight.

export type SubscriptionRole = 'farmer' | 'buyer' | 'transporter' | 'groups' | 'supplier';
export type BilledBy = 'self' | 'group';

export interface PlanConfig {
  id: string;
  role: SubscriptionRole;
  label: string;
  priceMonthlyUgx: number;
  priceYearlyUgx: number;
  billedBy: BilledBy;
  /** false = shown as "contact sales", never purchasable through POST /api/subscriptions */
  selfServe: boolean;
}

export const PLANS: Record<string, PlanConfig> = {
  farmer_pro: {
    id: 'farmer_pro', role: 'farmer', label: 'Farmer Pro',
    priceMonthlyUgx: 15_000, priceYearlyUgx: 144_000, billedBy: 'self', selfServe: true,
  },
  buyer_pro: {
    id: 'buyer_pro', role: 'buyer', label: 'Buyer Pro',
    priceMonthlyUgx: 25_000, priceYearlyUgx: 240_000, billedBy: 'self', selfServe: true,
  },
  driver_pro: {
    id: 'driver_pro', role: 'transporter', label: 'Driver Pro',
    priceMonthlyUgx: 12_000, priceYearlyUgx: 115_000, billedBy: 'self', selfServe: true,
  },
  group_pro: {
    id: 'group_pro', role: 'groups', label: 'Group Pro',
    priceMonthlyUgx: 65_000, priceYearlyUgx: 624_000, billedBy: 'group', selfServe: true,
  },
  business: {
    id: 'business', role: 'supplier', label: 'Business',
    priceMonthlyUgx: 50_000, priceYearlyUgx: 480_000, billedBy: 'self', selfServe: true,
  },
  enterprise: {
    id: 'enterprise', role: 'supplier', label: 'Enterprise',
    priceMonthlyUgx: 0, priceYearlyUgx: 0, billedBy: 'self', selfServe: false,
  },
};

export function getPlan(planId: string): PlanConfig | undefined {
  return PLANS[planId];
}

export function priceFor(plan: PlanConfig, billingCycle: 'monthly' | 'yearly'): number {
  return billingCycle === 'yearly' ? plan.priceYearlyUgx : plan.priceMonthlyUgx;
}
