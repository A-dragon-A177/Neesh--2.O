/**
 * NEESH V19 PIONEER GRADE & POINTS SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section M, Section AW Rule 4, V18-8, V18-9)
 * 
 * Non-negotiable rules:
 * 1. Pure arithmetic. No ML, no LLM, no OpenAI.
 * 2. WAR truncates to 2 decimal places — NEVER rounds up: FLOOR(raw * 100) / 100.
 * 3. Pioneer Points: FLOOR(WAR * 100) + (N * 10).
 * 4. Founder accounts < 30 days old are weighted 0.3x; >= 30 days weighted 1.0x.
 * 5. Auto-completed unrated interactions (aged > 7 days) count as rating 3.0 with weight 0.5.
 * 6. Spike check: 7-day velocity > 3x historical weekly average triggers spike flag.
 */

import { supabase } from '../config/supabase';
import { GRADE_FEE_RANGES } from '../constants/pricing';

export type PioneerGrade = 'SEED' | 'RISING' | 'PRO' | 'MASTER' | 'ELITE';

export interface InteractionScoringItem {
  id?: string;
  state: string; // 'RATED' | 'COMPLETE' | 'PENDING'
  founder_rating?: number | null;
  founder_account_created_at?: string | Date;
  is_auto_completed?: boolean;
}

export interface WARComputationResult {
  war: number; // 2 decimal places truncated
  rawWar: number;
  totalWeightedScore: number;
  totalWeight: number;
  qualifyingCount: number; // N
  pioneerPoints: number;
}

export interface GradeEvaluationResult {
  currentGrade: PioneerGrade;
  targetGrade: PioneerGrade;
  qualifies: boolean;
  war: number;
  n: number;
  points: number;
  reasons: string[];
  spikeFlagged: boolean;
  requiresAdmin: boolean;
}

export class PioneerGradeService {
  /**
   * Computes the Weighted Average Rating (WAR) and Pioneer Points.
   * Exact PRD formula:
   *   W_i = 1.0 if founder created > 30 days ago, else 0.3
   *   Unrated auto-complete: R_i = 3.0, W_i = 0.5
   *   Truncate WAR to 2 decimal places: FLOOR(raw * 100) / 100
   *   Points = FLOOR(WAR * 100) + (N * 10)
   */
  public static computeWARAndPoints(
    interactions: InteractionScoringItem[],
    nowDate: Date = new Date()
  ): WARComputationResult {
    let totalWeightedScore = 0;
    let totalWeight = 0;
    let qualifyingCount = 0;

    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

    for (const item of interactions) {
      if (item.state !== 'RATED' && item.state !== 'COMPLETE') {
        continue;
      }

      qualifyingCount++;

      // Check if unrated auto-completed interaction (Section M.4.5)
      const isUnratedAutoComplete =
        item.is_auto_completed ||
        item.founder_rating === null ||
        item.founder_rating === undefined;

      if (isUnratedAutoComplete) {
        // Treated as 3.0 rating with 0.5 weight
        totalWeightedScore += 3.0 * 0.5;
        totalWeight += 0.5;
        continue;
      }

      const rating = Number(item.founder_rating);
      let weight = 1.0;

      if (item.founder_account_created_at) {
        const createdAt = new Date(item.founder_account_created_at).getTime();
        const ageMs = nowDate.getTime() - createdAt;
        if (ageMs < thirtyDaysMs) {
          weight = 0.3; // Founder account < 30 days old
        }
      }

      totalWeightedScore += rating * weight;
      totalWeight += weight;
    }

    if (totalWeight === 0 || qualifyingCount === 0) {
      return {
        war: 0.0,
        rawWar: 0.0,
        totalWeightedScore: 0,
        totalWeight: 0,
        qualifyingCount: 0,
        pioneerPoints: 0,
      };
    }

    const rawWar = totalWeightedScore / totalWeight;
    // Non-negotiable truncation: FLOOR(raw * 100) / 100 (never round up)
    const truncatedWar = Math.floor(rawWar * 100) / 100;
    const pioneerPoints = Math.floor(truncatedWar * 100) + qualifyingCount * 10;

    return {
      war: truncatedWar,
      rawWar,
      totalWeightedScore,
      totalWeight,
      qualifyingCount,
      pioneerPoints,
    };
  }

  /**
   * Spike check: passes if 7-day velocity <= 3 * (total_interactions_90d / weeks_active).
   */
  public static checkSpike(
    interactionCount7d: number,
    totalInteractions90d: number,
    weeksActive: number = 13
  ): boolean {
    const divisor = Math.max(1, weeksActive);
    const weeklyAverage = totalInteractions90d / divisor;
    const threshold = 3 * weeklyAverage;
    return interactionCount7d > threshold;
  }

  /**
   * Evaluates if an Explorer qualifies for advancement to the next grade.
   */
  public static evaluateAdvancement(params: {
    currentGrade: PioneerGrade;
    war: number;
    n: number;
    linkedinVerified: boolean;
    linkedinVerifiedAt?: string | Date | null;
    linkedinTenureMonths?: number;
    seniorFastTrackCompleted?: boolean;
    masterFounderInteractionsCount?: number;
    spikeFlagged: boolean;
    nowDate?: Date;
  }): GradeEvaluationResult {
    const {
      currentGrade,
      war,
      n,
      linkedinVerified,
      linkedinVerifiedAt,
      linkedinTenureMonths = 0,
      seniorFastTrackCompleted = false,
      masterFounderInteractionsCount = 0,
      spikeFlagged,
      nowDate = new Date(),
    } = params;

    const reasons: string[] = [];

    if (spikeFlagged) {
      reasons.push('Advancement paused due to interaction spike detection');
      return {
        currentGrade,
        targetGrade: currentGrade,
        qualifies: false,
        war,
        n,
        points: Math.floor(war * 100) + n * 10,
        reasons,
        spikeFlagged: true,
        requiresAdmin: false,
      };
    }

    // Check ELITE eligibility (from MASTER)
    if (currentGrade === 'MASTER') {
      const isReverifiedWithinYear = this.isVerifiedWithin365Days(linkedinVerifiedAt, nowDate);
      if (
        n >= 50 &&
        war >= 4.5 &&
        isReverifiedWithinYear &&
        masterFounderInteractionsCount >= 10
      ) {
        return {
          currentGrade,
          targetGrade: 'ELITE',
          qualifies: true,
          war,
          n,
          points: Math.floor(war * 100) + n * 10,
          reasons: ['Crossed ELITE thresholds (N>=50, WAR>=4.50, >=10 Master interactions)'],
          spikeFlagged: false,
          requiresAdmin: true, // ELITE requires Admin approval
        };
      }
    }

    // Check MASTER eligibility (from PRO)
    if (currentGrade === 'PRO') {
      const isReverifiedWithinYear = this.isVerifiedWithin365Days(linkedinVerifiedAt, nowDate);
      if (n >= 25 && war >= 4.3 && isReverifiedWithinYear) {
        return {
          currentGrade,
          targetGrade: 'MASTER',
          qualifies: true,
          war,
          n,
          points: Math.floor(war * 100) + n * 10,
          reasons: ['Crossed MASTER thresholds (N>=25, WAR>=4.30)'],
          spikeFlagged: false,
          requiresAdmin: false,
        };
      }
    }

    // Check PRO eligibility (from RISING)
    if (currentGrade === 'RISING') {
      const hasSeniorTenureOrFastTrack =
        linkedinTenureMonths >= 60 || seniorFastTrackCompleted;

      if (n >= 10 && war >= 4.0 && linkedinVerified && hasSeniorTenureOrFastTrack) {
        return {
          currentGrade,
          targetGrade: 'PRO',
          qualifies: true,
          war,
          n,
          points: Math.floor(war * 100) + n * 10,
          reasons: ['Crossed PRO thresholds (N>=10, WAR>=4.00, tenure/fast-track verified)'],
          spikeFlagged: false,
          requiresAdmin: false,
        };
      }
    }

    // Check RISING eligibility (from SEED)
    if (currentGrade === 'SEED') {
      if (n >= 3 && war >= 3.8 && linkedinVerified) {
        return {
          currentGrade,
          targetGrade: 'RISING',
          qualifies: true,
          war,
          n,
          points: Math.floor(war * 100) + n * 10,
          reasons: ['Crossed RISING thresholds (N>=3, WAR>=3.80, LinkedIn verified)'],
          spikeFlagged: false,
          requiresAdmin: false,
        };
      }
    }

    return {
      currentGrade,
      targetGrade: currentGrade,
      qualifies: false,
      war,
      n,
      points: Math.floor(war * 100) + n * 10,
      reasons: ['Thresholds not yet met for next grade'],
      spikeFlagged: false,
      requiresAdmin: false,
    };
  }

  private static isVerifiedWithin365Days(verifiedAt?: string | Date | null, nowDate: Date = new Date()): boolean {
    if (!verifiedAt) return false;
    const diffMs = nowDate.getTime() - new Date(verifiedAt).getTime();
    return diffMs <= 365 * 24 * 60 * 60 * 1000;
  }
}

