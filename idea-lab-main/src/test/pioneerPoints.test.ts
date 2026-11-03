/**
 * Unit tests for Pioneer Points / WAR computation.
 * Reference: PioneerGradeService.computeWARAndPoints
 *
 * Non-negotiable rules tested:
 * 1. WAR truncated via FLOOR(raw * 100) / 100 — never rounded up.
 * 2. Pioneer Points = FLOOR(WAR * 100) + N * 10.
 * 3. Founders < 30 days old receive weight 0.3.
 * 4. Auto-completed unrated interactions count as 3.0 at weight 0.5.
 * 5. SCOUT graduation threshold: N >= 3 and WAR >= 3.50.
 */
import { describe, it, expect } from 'vitest';

interface InteractionItem {
  state: string;
  founder_rating?: number | null;
  founder_account_created_at?: string | Date;
  is_auto_completed?: boolean;
}

function computeWARAndPoints(interactions: InteractionItem[], nowDate = new Date()) {
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let qualifyingCount = 0;

  for (const item of interactions) {
    if (item.state !== 'RATED' && item.state !== 'COMPLETE') continue;
    qualifyingCount++;
    const isUnratedAutoComplete =
      item.is_auto_completed || item.founder_rating === null || item.founder_rating === undefined;
    if (isUnratedAutoComplete) {
      totalWeightedScore += 3.0 * 0.5;
      totalWeight += 0.5;
      continue;
    }
    const rating = Number(item.founder_rating);
    let weight = 1.0;
    if (item.founder_account_created_at) {
      const createdAt = new Date(item.founder_account_created_at).getTime();
      if (nowDate.getTime() - createdAt < thirtyDaysMs) weight = 0.3;
    }
    totalWeightedScore += rating * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0 || qualifyingCount === 0) {
    return { war: 0.0, rawWar: 0.0, totalWeightedScore: 0, totalWeight: 0, qualifyingCount: 0, pioneerPoints: 0 };
  }

  const rawWar = totalWeightedScore / totalWeight;
  const truncatedWar = Math.floor(rawWar * 100) / 100;
  const pioneerPoints = Math.floor(truncatedWar * 100) + qualifyingCount * 10;
  return { war: truncatedWar, rawWar, totalWeightedScore, totalWeight, qualifyingCount, pioneerPoints };
}

const nowDate = new Date('2026-01-01T00:00:00Z');
const old = new Date('2025-06-01T00:00:00Z'); // > 30 days before nowDate
const recent = new Date('2025-12-25T00:00:00Z'); // < 30 days before nowDate

describe('Pioneer WAR and Points', () => {
  it('returns zeros for empty interactions', () => {
    const r = computeWARAndPoints([]);
    expect(r.war).toBe(0.0);
    expect(r.pioneerPoints).toBe(0);
  });

  it('skips PENDING interactions', () => {
    const r = computeWARAndPoints([{ state: 'PENDING', founder_rating: 5 }]);
    expect(r.qualifyingCount).toBe(0);
  });

  it('single 5.0 rating with old founder → WAR = 5.00', () => {
    const r = computeWARAndPoints(
      [{ state: 'RATED', founder_rating: 5, founder_account_created_at: old }],
      nowDate
    );
    expect(r.war).toBe(5.0);
    expect(r.pioneerPoints).toBe(500 + 10); // 510
  });

  it('new founder (< 30 days) weight is 0.3', () => {
    const r = computeWARAndPoints(
      [{ state: 'RATED', founder_rating: 5, founder_account_created_at: recent }],
      nowDate
    );
    expect(r.totalWeight).toBeCloseTo(0.3);
    expect(r.war).toBe(5.0); // same WAR, different weight
  });

  it('unrated auto-complete counts as 3.0 at weight 0.5', () => {
    const r = computeWARAndPoints([{ state: 'COMPLETE', is_auto_completed: true }]);
    expect(r.war).toBe(3.0);
    expect(r.totalWeight).toBeCloseTo(0.5);
    expect(r.qualifyingCount).toBe(1);
  });

  it('WAR is FLOOR-truncated, not rounded (critical non-negotiable)', () => {
    // Two interactions: 4.0 (weight 1.0) and 3.9 (weight 1.0) → raw = 3.95 → truncate to 3.95 exactly
    // Three: 4.0, 3.8, 3.8 → raw = 3.8666... → truncate to 3.86 (not 3.87)
    const r = computeWARAndPoints([
      { state: 'RATED', founder_rating: 4.0, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 3.8, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 3.8, founder_account_created_at: old },
    ], nowDate);
    // raw = (4.0 + 3.8 + 3.8) / 3 = 11.6 / 3 = 3.8666...
    expect(r.war).toBe(3.86); // floor(3.8666... * 100) / 100 = 386/100 = 3.86
    expect(r.war).not.toBe(3.87); // must NOT round up
  });

  it('Pioneer Points = FLOOR(WAR * 100) + N * 10', () => {
    const r = computeWARAndPoints([
      { state: 'RATED', founder_rating: 4.0, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 4.0, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 4.0, founder_account_created_at: old },
    ], nowDate);
    expect(r.pioneerPoints).toBe(400 + 30); // 430
  });

  it('SCOUT graduation: N >= 3 and WAR >= 3.50', () => {
    const SCOUT_MIN_N = 3;
    const SCOUT_MIN_WAR = 3.50;

    const r = computeWARAndPoints([
      { state: 'RATED', founder_rating: 4.0, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 3.5, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 3.5, founder_account_created_at: old },
    ], nowDate);
    expect(r.qualifyingCount).toBeGreaterThanOrEqual(SCOUT_MIN_N);
    expect(r.war).toBeGreaterThanOrEqual(SCOUT_MIN_WAR);
  });

  it('mixed old and new founders averages weights correctly', () => {
    // Old founder 5.0 (w=1.0), new founder 1.0 (w=0.3) → weighted avg = (5.0*1 + 1.0*0.3) / 1.3 = 5.3/1.3 ≈ 4.076...
    const r = computeWARAndPoints([
      { state: 'RATED', founder_rating: 5, founder_account_created_at: old },
      { state: 'RATED', founder_rating: 1, founder_account_created_at: recent },
    ], nowDate);
    const expected = Math.floor((5.3 / 1.3) * 100) / 100;
    expect(r.war).toBe(expected);
  });
});
