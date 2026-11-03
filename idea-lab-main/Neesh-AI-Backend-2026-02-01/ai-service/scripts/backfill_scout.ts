/**
 * V20 Phase 1 — SCOUT Grade DB Backfill Script
 * Executes the data backfill on Supabase DB matching Task 9 specification:
 * Demotes existing SEED Explorers who have 0 completed interactions to SCOUT,
 * preserving Founding Explorers, Senior Fast-Track, and active Explorers with >= 1 interactions.
 */

import 'dotenv/config';
import { supabase } from '../src/config/supabase';

async function runBackfill() {
  console.log('================================================================');
  console.log('NEESH V20 — SCOUT GRADE SUPABASE BACKFILL SCRIPT');
  console.log('================================================================\n');

  try {
    // 1. Fetch matching candidates
    const { data: candidates, error: fetchError } = await supabase
      .from('explorer_profiles')
      .select('id, username, pioneer_grade, verified_interaction_count, is_founding_explorer, senior_fast_track, pioneer_points')
      .eq('pioneer_grade', 'SEED');

    if (fetchError) {
      console.error('[BACKFILL:ERROR] Failed to query explorer_profiles:', fetchError.message);
      return;
    }

    if (!candidates || candidates.length === 0) {
      console.log('[BACKFILL:INFO] No SEED explorer profiles found in the database.');
      return;
    }

    // Filter by criteria: verified_interaction_count == 0, is_founding_explorer == false, senior_fast_track == false
    const toDemote = candidates.filter((ep: any) => {
      const interactionCount = ep.verified_interaction_count || 0;
      const isFounding = Boolean(ep.is_founding_explorer);
      const isSenior = Boolean(ep.senior_fast_track);
      return interactionCount === 0 && !isFounding && !isSenior;
    });

    console.log(`[BACKFILL:INFO] Found ${candidates.length} total SEED profiles.`);
    console.log(`[BACKFILL:INFO] Identified ${toDemote.length} profiles eligible for SCOUT backfill (0 interactions, not founding, not senior fast-track).\n`);

    if (toDemote.length === 0) {
      console.log('[BACKFILL:SUCCESS] No profiles require demotion. Database is already in desired state.');
      return;
    }

    let updatedCount = 0;
    for (const profile of toDemote) {
      // Demote to SCOUT
      const { error: updateError } = await supabase
        .from('explorer_profiles')
        .update({
          pioneer_grade: 'SCOUT',
          fee_min_paise: '0',
          fee_max_paise: '0',
        })
        .eq('id', profile.id);

      if (updateError) {
        console.error(`[BACKFILL:FAIL] Failed to update profile ${profile.id} (${profile.username}):`, updateError.message);
        continue;
      }

      // Check if audit record exists
      const { data: existingAudit } = await supabase
        .from('pioneer_grade_history')
        .select('id')
        .eq('explorer_id', profile.id)
        .eq('reason', 'V20_BACKFILL')
        .maybeSingle();

      if (!existingAudit) {
        await supabase.from('pioneer_grade_history').insert({
          explorer_id: profile.id,
          from_grade: 'SEED',
          to_grade: 'SCOUT',
          reason: 'V20_BACKFILL',
          pioneer_points_at_change: profile.pioneer_points || 0,
        });
      }

      console.log(`[BACKFILL:UPDATED] Profile ${profile.username || profile.id} demoted SEED -> SCOUT`);
      updatedCount++;
    }

    console.log(`\n================================================================`);
    console.log(`[BACKFILL:COMPLETE] Successfully backfilled ${updatedCount}/${toDemote.length} profiles to SCOUT.`);
    console.log(`================================================================`);
  } catch (err: any) {
    console.error('[BACKFILL:FATAL] Unexpected exception during backfill:', err.message);
  }
}

runBackfill();
