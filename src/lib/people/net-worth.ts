/**
 * Net worth colour bands from the brief: red below $100K, orange above $100K, green above $200K.
 *
 * The brief leaves exactly $100,000 and $200,000 open. Both are treated as orange:
 *   low    netWorth <  100,000
 *   medium 100,000 <= netWorth <= 200,000
 *   high   netWorth >  200,000
 */

export const NET_WORTH_TIERS = ['low', 'medium', 'high'] as const;

export type NetWorthTier = (typeof NET_WORTH_TIERS)[number];

export const NET_WORTH_THRESHOLDS = {
  medium: 100_000,
  high: 200_000,
} as const;

export function getNetWorthTier(netWorth: number): NetWorthTier {
  if (netWorth > NET_WORTH_THRESHOLDS.high) return 'high';
  if (netWorth >= NET_WORTH_THRESHOLDS.medium) return 'medium';
  return 'low';
}

export interface NetWorthTierStyle {
  /** Full description, used for tooltips and screen readers. */
  label: string;
  /** Compact label shown under the legend swatch. */
  shortLabel: string;
  hex: string;
  /** Same colour as space-separated channels, for CSS `rgb(var(--tile-rgb) / alpha)`. */
  rgb: string;
}

/** Single source of truth for tier colours: tiles and the legend both read from here. */
export const NET_WORTH_TIER_STYLES: Record<NetWorthTier, NetWorthTierStyle> = {
  low: { label: 'Below $100K', shortLabel: '<$100K', hex: '#EF3022', rgb: '239 48 34' },
  medium: { label: '$100K to $200K', shortLabel: '$100K–$200K', hex: '#F7941D', rgb: '247 148 29' },
  high: { label: 'Above $200K', shortLabel: '>$200K', hex: '#3A9F48', rgb: '58 159 72' },
};

const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

export function formatCurrency(value: number): string {
  return usdFormatter.format(value);
}
