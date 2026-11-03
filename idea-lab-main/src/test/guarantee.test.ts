/**
 * Unit tests for Sprint Guarantee logic.
 * A Sprint guarantee refund is issued if a founder earns < 3 qualifying
 * interactions during a purchased Sprint window.
 * Tests the pure refund-eligibility calculation — no DB calls.
 */
import { describe, it, expect } from 'vitest';

const SPRINT_DAY_PRICE_PAISE = 8400n; // ₹84 / day
const GUARANTEE_MIN_INTERACTIONS = 3;

/**
 * Pure guarantee eligibility check.
 * Returns the refund amount in paise (may be 0n if not eligible).
 */
function evaluateGuarantee(params: {
  daysPurchased: number;
  qualifyingInteractions: number;
  isPaidGrade: boolean; // SCOUT is not eligible for guarantee
}): { eligible: boolean; refundPaise: bigint; reason: string } {
  const { daysPurchased, qualifyingInteractions, isPaidGrade } = params;

  if (!isPaidGrade) {
    return { eligible: false, refundPaise: 0n, reason: 'SCOUT grade is not eligible for Sprint Guarantee' };
  }

  if (daysPurchased < 7) {
    return { eligible: false, refundPaise: 0n, reason: 'Sprint Guarantee requires at least 7 days purchased' };
  }

  if (qualifyingInteractions >= GUARANTEE_MIN_INTERACTIONS) {
    return { eligible: false, refundPaise: 0n, reason: `${qualifyingInteractions} interactions meets the minimum of ${GUARANTEE_MIN_INTERACTIONS}` };
  }

  const totalPaise = SPRINT_DAY_PRICE_PAISE * BigInt(daysPurchased);
  return { eligible: true, refundPaise: totalPaise, reason: `Only ${qualifyingInteractions} qualifying interactions (need ${GUARANTEE_MIN_INTERACTIONS})` };
}

describe('Sprint Guarantee eligibility', () => {
  it('SCOUT is not eligible', () => {
    const r = evaluateGuarantee({ daysPurchased: 7, qualifyingInteractions: 0, isPaidGrade: false });
    expect(r.eligible).toBe(false);
    expect(r.refundPaise).toBe(0n);
    expect(r.reason).toContain('SCOUT');
  });

  it('less than 7 days purchased → not eligible', () => {
    const r = evaluateGuarantee({ daysPurchased: 3, qualifyingInteractions: 0, isPaidGrade: true });
    expect(r.eligible).toBe(false);
    expect(r.refundPaise).toBe(0n);
  });

  it('exactly 3 interactions → not eligible (minimum met)', () => {
    const r = evaluateGuarantee({ daysPurchased: 7, qualifyingInteractions: 3, isPaidGrade: true });
    expect(r.eligible).toBe(false);
    expect(r.refundPaise).toBe(0n);
  });

  it('4 interactions → not eligible', () => {
    const r = evaluateGuarantee({ daysPurchased: 7, qualifyingInteractions: 4, isPaidGrade: true });
    expect(r.eligible).toBe(false);
  });

  it('0 interactions in 7-day sprint → eligible for full refund', () => {
    const r = evaluateGuarantee({ daysPurchased: 7, qualifyingInteractions: 0, isPaidGrade: true });
    expect(r.eligible).toBe(true);
    expect(r.refundPaise).toBe(SPRINT_DAY_PRICE_PAISE * 7n); // 58,800 paise
  });

  it('1 interaction in 14-day sprint → eligible for full refund', () => {
    const r = evaluateGuarantee({ daysPurchased: 14, qualifyingInteractions: 1, isPaidGrade: true });
    expect(r.eligible).toBe(true);
    expect(r.refundPaise).toBe(SPRINT_DAY_PRICE_PAISE * 14n); // 117,600 paise
  });

  it('2 interactions in 30-day sprint → eligible for full refund', () => {
    const r = evaluateGuarantee({ daysPurchased: 30, qualifyingInteractions: 2, isPaidGrade: true });
    expect(r.eligible).toBe(true);
    expect(r.refundPaise).toBe(SPRINT_DAY_PRICE_PAISE * 30n); // 252,000 paise
  });

  it('refund amount uses exact BigInt arithmetic (no floating point)', () => {
    const r = evaluateGuarantee({ daysPurchased: 7, qualifyingInteractions: 0, isPaidGrade: true });
    // 8400 * 7 = 58800 — verifiable without floating point
    expect(r.refundPaise).toBe(58800n);
  });

  it('7-day sprint price exactly ₹588 (58,800 paise)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 7n).toBe(58800n);
  });

  it('30-day sprint price exactly ₹2,520 (252,000 paise)', () => {
    expect(SPRINT_DAY_PRICE_PAISE * 30n).toBe(252000n);
  });
});
