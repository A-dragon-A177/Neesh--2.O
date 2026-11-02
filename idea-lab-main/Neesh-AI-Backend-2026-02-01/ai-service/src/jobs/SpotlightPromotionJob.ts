/**
 * NEESH V19 SPOTLIGHT PROMOTION JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section U)
 * 
 * Schedule: Every 30 minutes
 * Purpose: Scans active Sparks. If completed interaction count >= 5,
 * transitions the spark to 'SPOTLIGHT_ELIGIBLE'.
 */

import { supabase } from '../config/supabase';

export async function runSpotlightPromotionJob(): Promise<{ evaluated: number; promoted: number }> {
  console.log('[SpotlightPromotionJob] Scanning active sparks for Spotlight promotion (>= 5 interactions)...');

  try {
    const { data: activeSparks, error } = await supabase
      .from('sparks')
      .select('id, title, state, founder_id')
      .eq('state', 'ACTIVE');

    if (error) {
      console.error('[SpotlightPromotionJob] Failed to query active sparks:', error);
      return { evaluated: 0, promoted: 0 };
    }

    if (!activeSparks || activeSparks.length === 0) {
      console.log('[SpotlightPromotionJob] No active sparks found.');
      return { evaluated: 0, promoted: 0 };
    }

    let promotedCount = 0;

    for (const spark of activeSparks) {
      const { count, error: countErr } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('spark_id', spark.id)
        .in('state', ['RATED', 'COMPLETE']);

      if (countErr) {
        console.warn(`[SpotlightPromotionJob] Error counting interactions for spark ${spark.id}:`, countErr);
        continue;
      }

      if ((count || 0) >= 5) {
        const { error: updateErr } = await supabase
          .from('sparks')
          .update({ state: 'SPOTLIGHT_ELIGIBLE' })
          .eq('id', spark.id);

        if (updateErr) {
          console.error(`[SpotlightPromotionJob] Failed to promote spark ${spark.id}:`, updateErr);
        } else {
          console.log(`[SpotlightPromotionJob] Spark ${spark.id} (${spark.title}) promoted to SPOTLIGHT_ELIGIBLE (interactions: ${count})`);
          promotedCount++;
        }
      }
    }

    console.log(`[SpotlightPromotionJob] Completed. Evaluated: ${activeSparks.length}, Promoted: ${promotedCount}`);
    return { evaluated: activeSparks.length, promoted: promotedCount };
  } catch (err) {
    console.error('[SpotlightPromotionJob] Unhandled exception:', err);
    return { evaluated: 0, promoted: 0 };
  }
}
