/**
 * NEESH V19 EXPLORER SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Sections L, O, P, T)
 * 
 * Non-negotiable rules:
 * 1. Founding Explorer cap is cumulative platform-wide (max 65).
 * 2. Senior Fast-Track tenure sums qualifying months across roles; gaps don't reset.
 * 3. Borderline tenure (55-64 months) flags manual review; does not auto-assign Pro.
 * 4. Preview feed is public, returns at most 3 real active sparks, and strips all PII.
 */

import crypto from 'crypto';
import { supabase } from '../config/supabase';
import {
  FOUNDING_EXPLORER_MAX_CAP,
  FOUNDING_EXPLORER_COMMISSION_FREE_DAYS,
  FOUNDING_EXPLORER_BASELINE_PAISE,
  GRADE_FEE_RANGES,
} from '../constants/pricing';

export interface LinkedInRole {
  title: string;
  company?: string;
  startDate: string | Date; // e.g. "2020-01-01"
  endDate?: string | Date | null; // null = current
  isDomainRelevant?: boolean;
}

export interface TenureParseResult {
  totalQualifyingMonths: number;
  qualifyingYears: number;
  isSeniorFastTrackEligible: boolean; // >= 60 months
  requiresManualReview: boolean; // 55–64 months
  rolesCount: number;
}

export interface PreviewFeedSpark {
  id: string; // "anon-[hash]"
  one_line_pitch: string;
  problem_statement: string;
  domain: string;
  interaction_count: number;
  founder_label: string; // "Founder in B2B SaaS"
  startup_label: string; // "[Startup]"
  avg_explorer_grade: string;
}

export class ExplorerService {
  /**
   * Parses and calculates tenure across multiple LinkedIn roles.
   * Additive: non-consecutive roles are summed; gaps do not reset tenure.
   */
  public static calculateTenureMonths(roles: LinkedInRole[], referenceDate: Date = new Date()): TenureParseResult {
    let totalMonths = 0;

    for (const role of roles) {
      if (role.isDomainRelevant === false) {
        continue;
      }

      const start = new Date(role.startDate);
      const end = role.endDate ? new Date(role.endDate) : referenceDate;

      if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
        continue;
      }

      // Calculate whole and partial months
      const yearDiff = end.getFullYear() - start.getFullYear();
      const monthDiff = end.getMonth() - start.getMonth();
      const dayDiff = end.getDate() - start.getDate();

      let months = yearDiff * 12 + monthDiff;
      if (dayDiff >= 15) {
        months += 1;
      }

      if (months > 0) {
        totalMonths += months;
      }
    }

    const isSeniorFastTrackEligible = totalMonths >= 60;
    // Borderline: 55–64 months triggers manual review flag (Section P.0)
    const requiresManualReview = totalMonths >= 55 && totalMonths <= 64;

    return {
      totalQualifyingMonths: totalMonths,
      qualifyingYears: Math.floor((totalMonths / 12) * 10) / 10,
      isSeniorFastTrackEligible,
      requiresManualReview,
      rolesCount: roles.length,
    };
  }

  /**
   * Senior Fast-Track candidate threshold check (strictly >= 60 months = 5 years).
   */
  public static isSeniorCandidate(monthsExperience: number): boolean {
    return monthsExperience >= 60; // exactly 5 years
  }

  /**
   * Checks cumulative platform-wide founding explorer cap and enrolls if < 65.
   */
  public static async checkAndEnrollFoundingExplorer(explorerProfileId: string): Promise<{
    enrolled: boolean;
    enrollmentNumber?: number;
    commissionFreeUntil?: string;
  }> {
    // 1. Check cumulative platform-wide count
    const { count, error } = await supabase
      .from('founding_explorer_registrations')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[ExplorerService] Error checking founding explorer count:', error);
      return { enrolled: false };
    }

    const currentCount = count || 0;
    if (currentCount >= FOUNDING_EXPLORER_MAX_CAP) {
      console.log(`[ExplorerService] Founding Explorer cap reached (${currentCount}/${FOUNDING_EXPLORER_MAX_CAP})`);
      return { enrolled: false };
    }

    const enrollmentNumber = currentCount + 1;
    const now = new Date();
    const commissionFreeUntil = new Date(
      now.getTime() + FOUNDING_EXPLORER_COMMISSION_FREE_DAYS * 24 * 60 * 60 * 1000
    ).toISOString();

    // 2. Insert into founding_explorer_registrations
    const { error: insertError } = await supabase
      .from('founding_explorer_registrations')
      .insert({
        explorer_id: explorerProfileId,
        enrollment_number: enrollmentNumber,
        commission_free_until: commissionFreeUntil,
        baseline_credit_amount_paise: FOUNDING_EXPLORER_BASELINE_PAISE.toString(),
      });

    if (insertError) {
      console.error('[ExplorerService] Failed to insert founding registration:', insertError);
      return { enrolled: false };
    }

    // 3. Update explorer_profiles
    // V20: Founding Explorer enrollment bypasses SCOUT — starts at SEED (the scarcity urgency warrants it)
    // Default for new explorers is 'SCOUT' (set at application layer)
    // Database column default remains 'SEED' for legacy safety
    await supabase
      .from('explorer_profiles')
      .update({
        is_founding_explorer: true,
        founding_explorer_enrolled_at: now.toISOString(),
        commission_free_until: commissionFreeUntil,
        pioneer_grade: 'SEED',
        fee_min_paise: '10000',
        fee_max_paise: '50000',
      })
      .eq('id', explorerProfileId);

    console.log(`[ExplorerService] Explorer ${explorerProfileId} enrolled as Founding Explorer #${enrollmentNumber}`);

    return {
      enrolled: true,
      enrollmentNumber,
      commissionFreeUntil,
    };
  }

  /**
   * Check if platform Founding Explorer cap (65) is reached.
   */
  public static async checkFoundingExplorerEligibility(explorerId?: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('founding_explorer_registrations')
        .select('*', { count: 'exact', head: true })
        .not('enrolled_at', 'is', null);

      if (error) {
        console.error('[ExplorerService] checkFoundingExplorerEligibility error:', error);
        return false;
      }

      return (count || 0) < FOUNDING_EXPLORER_MAX_CAP;
    } catch (err) {
      console.error('[ExplorerService] checkFoundingExplorerEligibility exception:', err);
      return false;
    }
  }

  /**
   * Pure evaluator for testing Founding Explorer enrollment logic.
   */
  public static canEnrollFoundingExplorer(currentEnrolledCount: number): boolean {
    return currentEnrolledCount < FOUNDING_EXPLORER_MAX_CAP;
  }

  /**
   * Senior Fast-Track choice handling:
   * Explorer chooses between "CONTINUE" (test interaction) or "RISING_INSTEAD".
   */
  public static async handleFastTrackChoice(
    explorerProfileId: string,
    choice: 'CONTINUE' | 'RISING_INSTEAD'
  ): Promise<{ newGrade: string; message: string; testInteractionId?: string }> {
    if (choice === 'RISING_INSTEAD') {
      const feeRange = GRADE_FEE_RANGES['RISING'];
      await supabase
        .from('explorer_profiles')
        .update({
          pioneer_grade: 'RISING',
          fee_min_paise: feeRange.minPaise.toString(),
          fee_max_paise: feeRange.maxPaise.toString(),
          senior_fast_track: false,
        })
        .eq('id', explorerProfileId);

      await supabase.from('pioneer_grade_history').insert({
        explorer_id: explorerProfileId,
        from_grade: 'SEED',
        to_grade: 'RISING',
        reason: 'CHOSE_RISING',
        pioneer_points_at_change: 0,
      });

      return {
        newGrade: 'RISING',
        message: 'Successfully started as Rising Pioneer (fee range ₹200 – ₹800).',
      };
    }

    // "CONTINUE" -> initiate test interaction assignment with an alpha founder Spotlight
    const { data: profile } = await supabase
      .from('explorer_profiles')
      .select('domain_id, user_id')
      .eq('id', explorerProfileId)
      .single();

    // Find an active alpha founder Spotlight in this domain
    let spotlightId: string | null = null;
    let founderId: string | null = null;

    if (profile?.domain_id) {
      const { data: alphaSpotlight } = await supabase
        .from('spotlights')
        .select('id, founder_id')
        .eq('domain_id', profile.domain_id)
        .in('state', ['SPRINT_ACTIVE', 'FREE_PERIOD'])
        .limit(1)
        .maybeSingle();

      if (alphaSpotlight) {
        spotlightId = alphaSpotlight.id;
        founderId = alphaSpotlight.founder_id;
      }
    }

    const testInteractionId = `test_int_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;

    if (spotlightId && founderId) {
      await supabase.from('interactions').insert({
        id: testInteractionId,
        spotlight_id: spotlightId,
        explorer_id: explorerProfileId,
        founder_id: founderId,
        interaction_type: 'SENIOR_FAST_TRACK_TEST',
        content: '[Senior Fast-Track Qualification Interaction]',
        state: 'PENDING',
      });
    }

    await supabase
      .from('explorer_profiles')
      .update({ senior_fast_track: true })
      .eq('id', explorerProfileId);

    return {
      newGrade: 'SEED',
      message: 'Senior Fast-Track initiated. Complete your test interaction for Pro grade qualification.',
      testInteractionId,
    };
  }

  /**
   * Resolves the result of a Senior Fast-Track test interaction.
   * Rating >= 3.0 -> PRO
   * Rating < 3.0 -> RISING
   */
  public static async resolveTestInteractionRating(
    explorerProfileId: string,
    rating: number
  ): Promise<{ assignedGrade: string; feeMinPaise: bigint; feeMaxPaise: bigint }> {
    const assignedGrade = rating >= 3.0 ? 'PRO' : 'RISING';
    const feeRange = GRADE_FEE_RANGES[assignedGrade];

    await supabase
      .from('explorer_profiles')
      .update({
        pioneer_grade: assignedGrade,
        fee_min_paise: feeRange.minPaise.toString(),
        fee_max_paise: feeRange.maxPaise.toString(),
      })
      .eq('id', explorerProfileId);

    await supabase.from('pioneer_grade_history').insert({
      explorer_id: explorerProfileId,
      from_grade: 'SEED',
      to_grade: assignedGrade,
      reason: 'SENIOR_FAST_TRACK',
      pioneer_points_at_change: 0,
    });

    console.log(`[ExplorerService] Test interaction rated ${rating} -> assigned ${assignedGrade}`);

    return {
      assignedGrade,
      feeMinPaise: feeRange.minPaise,
      feeMaxPaise: feeRange.maxPaise,
    };
  }

  /**
   * Returns up to 3 anonymized active Sparks for a domain (Preview Feed).
   * Strips all PII.
   */
  public static async getPreviewFeed(domainSlug: string): Promise<PreviewFeedSpark[]> {
    const { data: domain } = await supabase
      .from('domains')
      .select('id, name')
      .eq('slug', domainSlug)
      .maybeSingle();

    if (!domain) {
      return [];
    }

    const { data: sparks, error } = await supabase
      .from('sparks')
      .select('id, one_sentence_pitch, problem_solving, interaction_count, state')
      .eq('domain_id', domain.id)
      .eq('state', 'ACTIVE')
      .order('created_at', { ascending: false })
      .limit(3);

    if (error || !sparks) {
      return [];
    }

    return sparks.map((s) => {
      // Deterministic hash of id to prevent ID enumeration
      const hash = crypto.createHash('sha256').update(s.id).digest('hex').substring(0, 10);
      return {
        id: `anon-${hash}`,
        one_line_pitch: s.one_sentence_pitch,
        problem_statement: s.problem_solving,
        domain: domain.name,
        interaction_count: s.interaction_count || 0,
        founder_label: `Founder in ${domain.name}`,
        startup_label: '[Startup]',
        avg_explorer_grade: 'Rising',
      };
    });
  }
}

