import type { BusinessDecision, BusinessRole, BusinessStatus } from '@/types/scenario';

// Fixed locale so server and client render identical strings (avoids hydration mismatches).
const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const int = new Intl.NumberFormat('en-US');

export const formatUSD = (n: number) => usd.format(n);
export const formatInt = (n: number) => int.format(n);
export const formatPct = (fraction: number) => `${Math.round(fraction * 100)}%`;
export const formatK = (n: number) => `$${Math.round(n / 1000)}k`;

export const STATUS_LABEL: Record<BusinessStatus, string> = {
  funded: 'Funded',
  exposed_not_funded: 'Exposed, not funded',
  unaffected: 'Not affected',
};

export const ROLE_LABEL: Record<BusinessRole, string> = {
  anchor_direct: 'Loses footfall',
  upstream_supplier: 'Upstream supplier',
  downstream_buyer: 'Downstream buyer',
  retail_leaf: 'Storefront',
  independent: 'Independent',
};

export const STATUS_ORDER: BusinessStatus[] = ['funded', 'exposed_not_funded', 'unaffected'];

/** Funded by amount, then everyone else by exposure. */
export function rankBusinesses(list: BusinessDecision[]): BusinessDecision[] {
  return [...list].sort((a, b) => b.amount - a.amount || b.exposure - a.exposure);
}
