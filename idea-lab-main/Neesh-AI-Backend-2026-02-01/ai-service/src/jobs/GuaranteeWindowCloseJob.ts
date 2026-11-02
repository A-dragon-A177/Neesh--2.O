/**
 * NEESH V19 GUARANTEE WINDOW CLOSE JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section W.6.3, Section Y.10.2)
 * 
 * Schedule: 0 0 * * * (daily 00:00)
 * Purpose: Finds Sprint sessions where state = 'GUARANTEE_CLAIMABLE' and claim_window_closes_at
 * has elapsed without a claim. Transitions them to COMPLETED.
 */

import { supabase } from '../config/supabase';

export async function runGuaranteeWindowCloseJob(): Promise<{ evaluated: number; closed: number }> {
  console.log('[GuaranteeWindowCloseJob] Scanning for expired guarantee claim windows...');

  try {
    const nowIso = new Date().toISOString();
    const { data: expiredWindows, error } = await supabase
      .from('sprint_sessions')
      .select('id, spotlight_id, state, claim_window_closes_at')
      .eq('state', 'GUARANTEE_CLAIMABLE')
      .lte('claim_window_closes_at', nowIso);

    if (error) {
      console.error('[GuaranteeWindowCloseJob] Query error:', error);
      return { evaluated: 0, closed: 0 };
    }

    if (!expiredWindows || expiredWindows.length === 0) {
      return { evaluated: 0, closed: 0 };
    }

    let closedCount = 0;

    for (const session of expiredWindows) {
      const { error: updateErr } = await supabase
        .from('sprint_sessions')
        .update({
          state: 'COMPLETED',
          ineligibility_reason: 'CLAIM_WINDOW_EXPIRED',
        })
        .eq('id', session.id);

      if (!updateErr) {
        console.log(`[GuaranteeWindowCloseJob] Closed expired claim window for session ${session.id}`);
        closedCount++;
      } else {
        console.error(`[GuaranteeWindowCloseJob] Error updating session ${session.id}:`, updateErr);
      }
    }

    console.log(`[GuaranteeWindowCloseJob] Completed. Closed: ${closedCount}`);
    return { evaluated: expiredWindows.length, closed: closedCount };
  } catch (err) {
    console.error('[GuaranteeWindowCloseJob] Exception:', err);
    return { evaluated: 0, closed: 0 };
  }
}

