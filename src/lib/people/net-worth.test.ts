import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  getNetWorthTier,
  NET_WORTH_TIER_STYLES,
  NET_WORTH_TIERS,
} from './net-worth';

describe('getNetWorthTier', () => {
  it.each([
    [0, 'low'],
    [60_393.6, 'low'],
    [99_999.99, 'low'],
    [100_000, 'medium'],
    [150_000, 'medium'],
    [200_000, 'medium'],
    [200_000.01, 'high'],
    [251_260.8, 'high'],
  ] as const)('classifies %d as %s', (netWorth, tier) => {
    expect(getNetWorthTier(netWorth)).toBe(tier);
  });
});

describe('NET_WORTH_TIER_STYLES', () => {
  it.each(NET_WORTH_TIERS)('keeps the hex and rgb values of %s in sync', (tier) => {
    const { hex, rgb } = NET_WORTH_TIER_STYLES[tier];
    const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(' ');
    expect(rgb).toBe(channels);
  });
});

describe('formatCurrency', () => {
  it('formats whole US dollars', () => {
    expect(formatCurrency(251_260.8)).toBe('$251,261');
  });
});
