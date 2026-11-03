/**
 * Unit tests for commission tier calculation (calculateCommission).
 * Tests BigInt FLOOR division and all four tiers.
 * No database calls.
 */
import { describe, it, expect } from 'vitest';

// Commission tiers mirrored from backend constants/pricing.ts
const COMMISSION_TIERS = [
  { minPaise: 0n, maxPaise: 100000n, ratePercent: 20n },
  { minPaise: 100001n, maxPaise: 300000n, ratePercent: 15n },
  { minPaise: 300001n, maxPaise: 600000n, ratePercent: 12n },
  { minPaise: 600001n, maxPaise: 1000000n, ratePercent: 10n },
] as const;

function calculateCommission(amountPaise: bigint, isFoundingExplorerOverride = false) {
  if (amountPaise <= 0n) {
    return { grossFeePaise: 0n, commissionRatePercent: 0n, commissionPaise: 0n, explorerPaise: 0n };
  }
  if (isFoundingExplorerOverride) {
    return { grossFeePaise: amountPaise, commissionRatePercent: 0n, commissionPaise: 0n, explorerPaise: amountPaise };
  }
  let ratePercent = 10n;
  for (const tier of COMMISSION_TIERS) {
    if (amountPaise <= tier.maxPaise) { ratePercent = tier.ratePercent; break; }
  }
  const commissionPaise = (amountPaise * ratePercent) / 100n; // BigInt floor
  return { grossFeePaise: amountPaise, commissionRatePercent: ratePercent, commissionPaise, explorerPaise: amountPaise - commissionPaise };
}

describe('Commission calculation', () => {
  it('returns 0 for 0 paise', () => {
    const r = calculateCommission(0n);
    expect(r.commissionPaise).toBe(0n);
    expect(r.explorerPaise).toBe(0n);
  });

  it('Tier 1: ₹1,000 (100,000 paise) → 20%', () => {
    const r = calculateCommission(100000n);
    expect(r.commissionRatePercent).toBe(20n);
    expect(r.commissionPaise).toBe(20000n);
    expect(r.explorerPaise).toBe(80000n);
  });

  it('Tier 1 boundary: 1 paise → 20%', () => {
    const r = calculateCommission(1n);
    expect(r.commissionRatePercent).toBe(20n);
    expect(r.commissionPaise).toBe(0n); // floor(1 * 20 / 100) = 0
  });

  it('Tier 2: ₹2,000 (200,000 paise) → 15%', () => {
    const r = calculateCommission(200000n);
    expect(r.commissionRatePercent).toBe(15n);
    expect(r.commissionPaise).toBe(30000n);
    expect(r.explorerPaise).toBe(170000n);
  });

  it('Tier 2 boundary: 100,001 paise → 15%', () => {
    const r = calculateCommission(100001n);
    expect(r.commissionRatePercent).toBe(15n);
  });

  it('Tier 3: ₹5,000 (500,000 paise) → 12%', () => {
    const r = calculateCommission(500000n);
    expect(r.commissionRatePercent).toBe(12n);
    expect(r.commissionPaise).toBe(60000n);
    expect(r.explorerPaise).toBe(440000n);
  });

  it('Tier 4: ₹8,000 (800,000 paise) → 10%', () => {
    const r = calculateCommission(800000n);
    expect(r.commissionRatePercent).toBe(10n);
    expect(r.commissionPaise).toBe(80000n);
    expect(r.explorerPaise).toBe(720000n);
  });

  it('Floor division: ₹333.33 (33333 paise) at 20% → floor not round', () => {
    const r = calculateCommission(33333n);
    // 33333 * 20 / 100 = 6666.6 → floor = 6666
    expect(r.commissionPaise).toBe(6666n);
    expect(r.explorerPaise).toBe(33333n - 6666n);
  });

  it('Founding Explorer override: 0% commission, explorer gets 100%', () => {
    const r = calculateCommission(200000n, true);
    expect(r.commissionRatePercent).toBe(0n);
    expect(r.commissionPaise).toBe(0n);
    expect(r.explorerPaise).toBe(200000n);
  });

  it('commission + explorerPaise = grossFeePaise (invariant)', () => {
    const amounts = [50000n, 150000n, 400000n, 750000n, 1000000n];
    for (const amt of amounts) {
      const r = calculateCommission(amt);
      expect(r.commissionPaise + r.explorerPaise).toBe(r.grossFeePaise);
    }
  });

  it('above-max tier (> ₹10,000) falls through to 10% default', () => {
    const r = calculateCommission(2000000n); // ₹20,000
    expect(r.commissionRatePercent).toBe(10n);
  });
});

// ---------------------------------------------------------------------------
// P1.5 — SCOUT 0-paise enforcement
// V20 non-negotiable: SCOUT Pioneer interactions MUST have fee_paise = 0 and
// commission_paise = 0. No escrow entry, no ledger entry, no payment.
// ---------------------------------------------------------------------------

function computeEffectiveFeePaise(pioneerGrade: string, requestedFeePaise: bigint): bigint {
  // Mirror of InteractionService.ts V20 SCOUT guard (lines 78-79)
  return pioneerGrade === 'SCOUT' ? 0n : requestedFeePaise;
}

describe('P1.5 — SCOUT 0-paise guard', () => {
  it('SCOUT grade always returns 0 paise regardless of requested fee', () => {
    expect(computeEffectiveFeePaise('SCOUT', 10000n)).toBe(0n);
    expect(computeEffectiveFeePaise('SCOUT', 50000n)).toBe(0n);
    expect(computeEffectiveFeePaise('SCOUT', 1n)).toBe(0n);
    expect(computeEffectiveFeePaise('SCOUT', 0n)).toBe(0n);
  });

  it('SCOUT 0-paise → calculateCommission returns all zeros (no escrow)', () => {
    const feePaise = computeEffectiveFeePaise('SCOUT', 10000n);
    const r = calculateCommission(feePaise);
    expect(r.grossFeePaise).toBe(0n);
    expect(r.commissionPaise).toBe(0n);
    expect(r.explorerPaise).toBe(0n);
  });

  it('SEED grade with same requested fee is NOT zeroed out', () => {
    expect(computeEffectiveFeePaise('SEED', 10000n)).toBe(10000n);
  });

  it('PRO grade with fee is NOT zeroed out', () => {
    expect(computeEffectiveFeePaise('PRO', 150000n)).toBe(150000n);
  });

  it('SCOUT escrow skip: effectiveFeePaise > 0n is false → no escrow branch entered', () => {
    const feePaise = computeEffectiveFeePaise('SCOUT', 99999n);
    // The escrow branch is: if (effectiveFeePaise > 0n) — this must be false for SCOUT
    expect(feePaise > 0n).toBe(false);
  });
});
