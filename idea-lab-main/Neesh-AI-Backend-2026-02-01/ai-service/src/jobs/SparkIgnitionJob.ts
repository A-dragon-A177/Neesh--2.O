/**
 * NEESH V19 SPARK IGNITION JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section U)
 * 
 * Schedule: 0 * * * * (every hour)
 * Purpose: Finds Sparks with < 3 interactions at:
 *  - 72 hours (attempt #1)
 *  - 120 hours (attempt #2, final)
 * Invites 3 Rising+ Pioneers in that domain via spark_ignition_invites.
 * Max 2 attempts per spark.
 */

import { supabase } from '../config/supabase';

export async function runSparkIgnitionJob(): Promise<{ evaluated: number; ignited: number }> {
  console.log('[SparkIgnitionJob] Scanning active sparks for ignition assistance...');

  try {
    const { data: activeSparks, error } = await supabase
      .from('sparks')
      .select('id, domain, created_at, state')
      .eq('state', 'ACTIVE');

    if (error) {
      console.error('[SparkIgnitionJob] Failed to query active sparks:', error);
      return { evaluated: 0, ignited: 0 };
    }

    if (!activeSparks || activeSparks.length === 0) {
      return { evaluated: 0, ignited: 0 };
    }

    const now = Date.now();
    let ignitedCount = 0;

    for (const spark of activeSparks) {
      const ageHours = (now - new Date(spark.created_at).getTime()) / (1000 * 60 * 60);

      // Check current ignition attempts
      const { data: previousInvites } = await supabase
        .from('spark_ignition_invites')
        .select('attempt_number, explorer_id')
        .eq('spark_id', spark.id);

      const maxAttempt = previousInvites?.reduce((max, inv) => Math.max(max, inv.attempt_number || 1), 0) || 0;

      let targetAttempt = 0;
      if (ageHours >= 120 && maxAttempt < 2) {
        targetAttempt = 2;
      } else if (ageHours >= 72 && maxAttempt < 1) {
        targetAttempt = 1;
      }

      if (targetAttempt === 0) {
        continue; // Not within ignition window or already received max attempts
      }

      // Check interaction count (< 3 required)
      const { count } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('spark_id', spark.id);

      if ((count || 0) >= 3) {
        continue; // Already has 3+ interactions
      }

      // Find 3 Rising+ Pioneers in the domain who haven't been invited yet
      const alreadyInvitedIds = new Set(previousInvites?.map((i) => i.explorer_id) || []);

      const { data: eligiblePioneers } = await supabase
        .from('explorer_profiles')
        .select('id, user_id, pioneer_grade, domain')
        .eq('domain', spark.domain)
        .eq('state', 'ACTIVE')
        .in('pioneer_grade', ['RISING', 'PRO', 'MASTER', 'ELITE'])
        .limit(10);

      const toInvite = (eligiblePioneers || [])
        .filter((p) => !alreadyInvitedIds.has(p.id))
        .slice(0, 3);

      if (toInvite.length > 0) {
        const invitesToInsert = toInvite.map((p) => ({
          spark_id: spark.id,
          explorer_id: p.id,
          attempt_number: targetAttempt,
          invited_at: new Date().toISOString(),
        }));

        const { error: inviteErr } = await supabase
          .from('spark_ignition_invites')
          .insert(invitesToInsert);

        if (!inviteErr) {
          console.log(`[SparkIgnitionJob] Spark ${spark.id} ignited (attempt #${targetAttempt}) with ${toInvite.length} pioneers`);
          ignitedCount++;
        } else {
          console.error(`[SparkIgnitionJob] Error inserting invites for spark ${spark.id}:`, inviteErr);
        }
      }
    }

    console.log(`[SparkIgnitionJob] Completed. Evaluated: ${activeSparks.length}, Ignited: ${ignitedCount}`);
    return { evaluated: activeSparks.length, ignited: ignitedCount };
  } catch (err) {
    console.error('[SparkIgnitionJob] Exception:', err);
    return { evaluated: 0, ignited: 0 };
  }
}

