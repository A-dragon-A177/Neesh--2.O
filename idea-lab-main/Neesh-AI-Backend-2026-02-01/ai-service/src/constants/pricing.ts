/**
 * NEESH V19 CANONICAL PRICING & FINANCIAL CONSTANTS
 * Reference: NEESH_V19_MASTER_PRD.md (Section AW Rule 3, Section W.3, Section W.5, Section O.1, Section O.3)
 * 
 * Non-negotiable rules:
 * 1. All internal money calculations must use integer BigInt paise.
 * 2. Never use floating-point numbers for money calculations.
 * 3. Sprint price is strictly ₹84/day = 8,400 paise.
 * 4. Founding Explorer baseline credit is exactly ₹2,500 = 250,000 paise.
 * 5. Founding Explorer enrollment is capped at 65 platform-wide.
 */

// Sprint Pricing (₹84 per day in standard paise: ₹1 = 100 paise)
export const SPRINT_DAY_PRICE_PAISE: bigint = 8400n;

// Recommended Sprint purchase duration options
// Note: SCOUT grade cannot participate in Sprint Guarantee evaluations
export const ALLOWED_SPRINT_DAYS: readonly number[] = [1, 3, 7, 14, 30] as const;

// Platform System User ID for ledger system entries (Section W.5)
export const PLATFORM_SYSTEM_ID = '00000000-0000-0000-0000-000000000001';

// Founding Explorer Constants (Section O)
export const FOUNDING_EXPLORER_BASELINE_PAISE: bigint = 250000n; // ₹2,500 floor check
export const FOUNDING_EXPLORER_MAX_CAP: number = 65; // Cumulative platform-wide cap
export const FOUNDING_EXPLORER_COMMISSION_FREE_DAYS: number = 90; // 90 days commission free
export const SCOUT_INTERACTION_FEE_PAISE: bigint = 0n;

// Pioneer Grade Fee Ranges in Paise (Section O.1 & Schema Defaults)
export interface GradeFeeRange {
  readonly minPaise: bigint;
  readonly maxPaise: bigint;
}

export const GRADE_FEE_RANGES: Record<string, GradeFeeRange> = {
  SCOUT: { minPaise: 0n, maxPaise: 0n },               // Free tier — no payment
  SEED: { minPaise: 10000n, maxPaise: 50000n },        // ₹100 – ₹500
  RISING: { minPaise: 20000n, maxPaise: 80000n },      // ₹200 – ₹800
  PRO: { minPaise: 80000n, maxPaise: 300000n },        // ₹800 – ₹3,000
  MASTER: { minPaise: 300000n, maxPaise: 600000n },    // ₹3,000 – ₹6,000
  ELITE: { minPaise: 600000n, maxPaise: 1000000n },    // ₹6,000 – ₹10,000
} as const;

// Commission Tiers (W.3)
export interface CommissionTier {
  readonly minPaise: bigint;
  readonly maxPaise: bigint;
  readonly ratePercent: bigint; // e.g., 20n for 20%
}

export const COMMISSION_TIERS: readonly CommissionTier[] = [
  { minPaise: 0n, maxPaise: 100000n, ratePercent: 20n },       // <= ₹1,000 -> 20%
  { minPaise: 100001n, maxPaise: 300000n, ratePercent: 15n },  // ₹1,001 to ₹3,000 -> 15%
  { minPaise: 300001n, maxPaise: 600000n, ratePercent: 12n },  // ₹3,001 to ₹6,000 -> 12%
  { minPaise: 600001n, maxPaise: 1000000n, ratePercent: 10n }, // ₹6,001 to ₹10,000 -> 10%
] as const;

/**
 * Deterministic commission calculation in integer paise using FLOOR division.
 * 
 * @param amountPaise Gross interaction/request fee in paise
 * @param isFoundingExplorerOverride If true and active, commission is 0%
 * @returns Object with commissionPaise and explorerPaise
 */
export function calculateCommission(
  amountPaise: bigint,
  isFoundingExplorerOverride: boolean = false
): {
  grossFeePaise: bigint;
  commissionRatePercent: bigint;
  commissionPaise: bigint;
  explorerPaise: bigint;
} {
  if (amountPaise <= 0n) {
    return {
      grossFeePaise: 0n,
      commissionRatePercent: 0n,
      commissionPaise: 0n,
      explorerPaise: 0n,
    };
  }

  // W.4 Founding Explorer Commission Override (0% commission)
  if (isFoundingExplorerOverride) {
    return {
      grossFeePaise: amountPaise,
      commissionRatePercent: 0n,
      commissionPaise: 0n,
      explorerPaise: amountPaise,
    };
  }

  // Find matching tier
  let ratePercent = 10n; // Default fallback for > ₹10,000
  for (const tier of COMMISSION_TIERS) {
    if (amountPaise <= tier.maxPaise) {
      ratePercent = tier.ratePercent;
      break;
    }
  }

  // BigInt integer division inherently performs floor()
  const commissionPaise = (amountPaise * ratePercent) / 100n;
  const explorerPaise = amountPaise - commissionPaise;

  return {
    grossFeePaise: amountPaise,
    commissionRatePercent: ratePercent,
    commissionPaise,
    explorerPaise,
  };
}
