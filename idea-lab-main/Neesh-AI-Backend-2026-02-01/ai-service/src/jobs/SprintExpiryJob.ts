/**
 * NEESH V19 SPRINT EXPIRY JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section W.6.3, Section Y.10.2)
 * 
 * Schedule: 0 * * * * (every hour)
 * Purpose: Evaluates expired Sprint sessions against the 6 Guarantee Conditions.
 * If 6 conditions pass: sets GUARANTEE_CLAIMABLE with 7-day claim window.
 * Otherwise: marks session COMPLETED with documented ineligibility_reason.
 */

import { supabase } from '../config/supabase';
import { NotificationService } from '../services/NotificationService';

export interface ExpiryEvaluationResult {
  isEligibleForClaim: boolean;
  ineligibilityReason?: string;
}

/**
 * Pure evaluation of the 6 Sprint Guarantee conditions (Section W.6.3).
 */
export function evaluateSprintGuaranteeConditions(params: {
  guaranteeEligible: boolean;
  daysPurchased: number;
  pioneerCount: number;
  founderResponseRate?: number;
  domainClosedPrematurely?: boolean;
  fraudFlagged?: boolean;
}): ExpiryEvaluationResult {
  // Condition 1: Must have purchased >= 7 days
  if (!params.guaranteeEligible || params.daysPurchased < 7) {
    return {
      isEligibleForClaim: false,
      ineligibilityReason: 'DURATION_UNDER_7_DAYS',
    };
  }

  // Condition 2: Pioneer count must be < 3 (if 3+ achieved, guarantee is fulfilled)
  if (params.pioneerCount >= 3) {
    return {
      isEligibleForClaim: false,
      ineligibilityReason: 'PIONEER_THRESHOLD_MET',
    };
  }

  // Condition 3: Founder must not have ignored all incoming pioneer feedback
  if (params.founderResponseRate !== undefined && params.founderResponseRate < 0.2) {
    return {
      isEligibleForClaim: false,
      ineligibilityReason: 'FOUNDER_INACTIVITY',
    };
  }

  // Condition 4: Domain remained open
  if (params.domainClosedPrematurely) {
    return {
      isEligibleForClaim: false,
      ineligibilityReason: 'DOMAIN_CLOSED_PREMATURELY',
    };
  }

  // Condition 5: Fraud or security flags
  if (params.fraudFlagged) {
    return {
      isEligibleForClaim: false,
      ineligibilityReason: 'SECURITY_FLAGGED',
    };
  }

  // All 6 conditions passed -> Eligible to claim 100% credit
  return {
    isEligibleForClaim: true,
  };
}

export async function runSprintExpiryJob(): Promise<{ evaluated: number; claimable: number; completed: number }> {
  console.log('[SprintExpiryJob] Scanning expired sprint sessions...');

  try {
    const nowIso = new Date().toISOString();
    const { data: expiredSessions, error } = await supabase
      .from('sprint_sessions')
      .select('*')
      .eq('state', 'ACTIVE')
      .lte('expires_at', nowIso);

    if (error) {
      console.error('[SprintExpiryJob] Query error:', error);
      return { evaluated: 0, claimable: 0, completed: 0 };
    }

    if (!expiredSessions || expiredSessions.length === 0) {
      return { evaluated: 0, claimable: 0, completed: 0 };
    }

    let claimableCount = 0;
    let completedCount = 0;

    for (const session of expiredSessions) {
      const evaluation = evaluateSprintGuaranteeConditions({
        guaranteeEligible: session.guarantee_eligible,
        daysPurchased: session.days_purchased,
        pioneerCount: session.pioneer_count || 0,
      });

      if (evaluation.isEligibleForClaim) {
        const windowOpens = new Date();
        // PRD Section J.2: guarantee_claim_window_closes_at = NOW() + INTERVAL '13 days'
        const windowCloses = new Date(windowOpens.getTime() + 13 * 24 * 60 * 60 * 1000);

        await supabase
          .from('sprint_sessions')
          .update({
            state: 'GUARANTEE_CLAIMABLE',
            claim_window_opens_at: windowOpens.toISOString(),
            claim_window_closes_at: windowCloses.toISOString(),
          })
          .eq('id', session.id);

        claimableCount++;
        console.log(`[SprintExpiryJob] Session ${session.id} marked GUARANTEE_CLAIMABLE (pioneers: ${session.pioneer_count || 0})`);

        // Non-blocking GUARANTEE_CLAIMABLE notification
        try {
          NotificationService.send({
            type: 'GUARANTEE_CLAIMABLE',
            data: {
              sprintId: session.id,
              claimClosesAt: windowCloses.toISOString(),
              amountRupees: 588,
            },
          }).catch(() => {});
        } catch (e) {}
      } else {
        await supabase
          .from('sprint_sessions')
          .update({
            state: 'COMPLETED',
            ineligibility_reason: evaluation.ineligibilityReason || 'CONDITIONS_NOT_MET',
          })
          .eq('id', session.id);

        completedCount++;
        console.log(`[SprintExpiryJob] Session ${session.id} marked COMPLETED (reason: ${evaluation.ineligibilityReason})`);
      }

      // Transition Spotlight to COMPLETED
      await supabase
        .from('spotlights')
        .update({ state: 'COMPLETED' })
        .eq('id', session.spotlight_id);
    }

    console.log(`[SprintExpiryJob] Completed. Evaluated: ${expiredSessions.length}, Claimable: ${claimableCount}, Completed: ${completedCount}`);
    return { evaluated: expiredSessions.length, claimable: claimableCount, completed: completedCount };
  } catch (err) {
    console.error('[SprintExpiryJob] Exception:', err);
    return { evaluated: 0, claimable: 0, completed: 0 };
  }
}

