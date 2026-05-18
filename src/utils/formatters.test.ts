import { describe, expect, it } from 'vitest';
import { formatDateTH, formatPercent, formatTHB, trendColor } from '@/utils/formatters';

describe('formatTHB', () => {
  it('formats a positive integer with thousand separators', () => {
    // Locale-tolerant: Node ICU may emit "฿1,000,000" or "THB 1,000,000".
    // The thousands separator and digit run are stable across builds.
    expect(formatTHB(1_000_000)).toMatch(/1,000,000/);
  });

  it('formats a very large value with thousand separators', () => {
    expect(formatTHB(10_500_000)).toMatch(/10,500,000/);
  });

  it('formats zero', () => {
    expect(formatTHB(0)).toMatch(/0/);
  });

  it('formats a negative value with a leading minus', () => {
    const out = formatTHB(-12_345);
    expect(out).toMatch(/12,345/);
    expect(out).toMatch(/-|−/);
  });
});

describe('formatPercent', () => {
  it('prefixes a positive fractional value with +', () => {
    expect(formatPercent(0.0123)).toBe('+1.23%');
  });

  it('prefixes a negative fractional value with -', () => {
    expect(formatPercent(-0.0123)).toBe('-1.23%');
  });

  it('treats zero as non-negative (matches spec: v >= 0 gets +)', () => {
    expect(formatPercent(0)).toBe('+0.00%');
  });

  it('respects the optional decimals argument', () => {
    expect(formatPercent(0.123456, 4)).toBe('+12.3456%');
    expect(formatPercent(0.5, 0)).toBe('+50%');
  });
});

describe('formatDateTH', () => {
  it('returns a non-empty string for a valid ISO timestamp', () => {
    const out = formatDateTH('2026-05-18T00:00:00.000Z');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});

describe('trendColor', () => {
  it('returns green for positive values', () => {
    expect(trendColor(0.01)).toBe('text-green-400');
  });

  it('returns red for negative values', () => {
    expect(trendColor(-0.01)).toBe('text-red-400');
  });

  it('returns gray for zero', () => {
    expect(trendColor(0)).toBe('text-gray-400');
  });
});
