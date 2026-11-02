/**
 * NEESH V19 CANONICAL PRICING & FINANCIAL CONSTANTS (FRONTEND)
 * Reference: NEESH_V19_MASTER_PRD.md (Section AW Rule 3, Section W.3, Section W.5, Section O.1, Section O.3)
 */

// Sprint Pricing (₹84 per day in standard paise: ₹1 = 100 paise)
export const SPRINT_DAY_PRICE_PAISE: bigint = 8400n;

// Recommended Sprint purchase duration options
export const ALLOWED_SPRINT_DAYS: readonly number[] = [1, 3, 7, 14, 30] as const;

// Founding Explorer Constants
export const FOUNDING_EXPLORER_BASELINE_PAISE: bigint = 250000n;
export const FOUNDING_EXPLORER_MAX_CAP: number = 65;
export const FOUNDING_EXPLORER_COMMISSION_FREE_DAYS: number = 90;

// Grade Fee Ranges
export interface GradeFeeRange {
  readonly minPaise: bigint;
  readonly maxPaise: bigint;
}

export const GRADE_FEE_RANGES: Record<string, GradeFeeRange> = {
  SEED: { minPaise: 10000n, maxPaise: 50000n },        // ₹100 – ₹500
  RISING: { minPaise: 20000n, maxPaise: 80000n },      // ₹200 – ₹800
  PRO: { minPaise: 80000n, maxPaise: 300000n },        // ₹800 – ₹3,000
  MASTER: { minPaise: 300000n, maxPaise: 600000n },    // ₹3,000 – ₹6,000
  ELITE: { minPaise: 600000n, maxPaise: 1000000n },    // ₹6,000 – ₹10,000
} as const;

export interface CommissionTier {
  readonly minPaise: bigint;
  readonly maxPaise: bigint;
  readonly ratePercent: bigint;
}

export const COMMISSION_TIERS: readonly CommissionTier[] = [
  { minPaise: 0n, maxPaise: 100000n, ratePercent: 20n },
  { minPaise: 100001n, maxPaise: 300000n, ratePercent: 15n },
  { minPaise: 300001n, maxPaise: 600000n, ratePercent: 12n },
  { minPaise: 600001n, maxPaise: 1000000n, ratePercent: 10n },
] as const;
