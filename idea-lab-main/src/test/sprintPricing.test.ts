/**
 * Unit tests for sprint pricing arithmetic and parsePaise helper.
 *
 * Validates:
 * - SPRINT_DAY_PRICE_PAISE = 8400n (₹84/day)
 * - Allowed sprint durations: [1, 3, 7, 14, 30]
 * - parsePaise correctly converts decimal rupee strings to BigInt paise
 * - No IEEE 754 float rounding for boundary amounts
 */
import { describe, it, expect } from 'vitest';

// Mirror of parsePaise from WebhookController.ts (M-02 fix)
function parsePaise(raw: unknown): bigint {
  const s = String(raw ?? '0').trim();
  const [int, frac = ''] = s.split('.');
  const paddedFrac = frac.padEnd(2, '0').slice(0, 2);
  return BigInt(int + paddedFrac);
}

const SPRINT_DAY_PRICE_PAISE = 8400n;
const ALLOWED_SPRINT_DAYS = [1, 3, 7, 14, 30] as const;

describe('Sprint day pricing constants', () => {
  it('sprint day price is exactly ₹84 (8400 paise)', () => {
    expect(SPRINT_DAY_PRICE_PAISE).toBe(8400n);
  });

  it('allowed sprint days are [1, 3, 7, 14, 30]', () => {
    expect([...ALLOWED_SPRINT_DAYS]).toEqual([1, 3, 7, 14, 30]);
  });

  it('1-day sprint = 8,400 paise', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 1n).toBe(8400n);
  });

  it('3-day sprint = 25,200 paise (₹252)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 3n).toBe(25200n);
  });

  it('7-day sprint = 58,800 paise (₹588)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 7n).toBe(58800n);
  });

  it('14-day sprint = 117,600 paise (₹1,176)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 14n).toBe(117600n);
  });

  it('30-day sprint = 252,000 paise (₹2,520)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 30n).toBe(252000n);
  });
});

describe('parsePaise (M-02 fix)', () => {
  it('whole number rupees', () => {
    expect(parsePaise('84')).toBe(8400n);
  });

  it('two decimal places', () => {
    expect(parsePaise('84.00')).toBe(8400n);
  });

  it('one decimal place padded to two', () => {
    expect(parsePaise('84.5')).toBe(8450n);
  });

  it('₹1,234.56 → 123456 paise', () => {
    expect(parsePaise('1234.56')).toBe(123456n);
  });

  it('boundary: ₹1,234.57 (no float error)', () => {
    // IEEE 754: Number('1234.57') * 100 → 123456.99999... → Math.round → 123457
    // parsePaise must produce exactly 123457n
    expect(parsePaise('1234.57')).toBe(123457n);
  });

  it('₹0.99 → 99 paise', () => {
    expect(parsePaise('0.99')).toBe(99n);
  });

  it('zero', () => {
    expect(parsePaise('0')).toBe(0n);
    expect(parsePaise(0)).toBe(0n);
  });

  it('null/undefined defaults to 0', () => {
    expect(parsePaise(null)).toBe(0n);
    expect(parsePaise(undefined)).toBe(0n);
  });

  it('truncates excess decimal places to 2', () => {
    // '100.999' → int='100', frac='999' → padded='99' → 10099
    expect(parsePaise('100.999')).toBe(10099n);
  });

  it('numeric input (not string)', () => {
    // Cashfree may send a number instead of string
    expect(parsePaise(588)).toBe(58800n);
  });

  it('parsePaise result matches sprint 7-day price', () => {
    expect(parsePaise('588.00')).toBe(SPRINT_DAY_PRICE_PAISE * 7n);
  });
});
