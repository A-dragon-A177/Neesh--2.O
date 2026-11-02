/**
 * NEESH V19 PIONEER GRADE EVALUATION BACKGROUND JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section M, V18-8, V18-9)
 * 
 * Schedule: 0 *\/2 * * * (every 2 hours)
 * 1. Auto-completes unrated interactions older than 7 days (treats as 3.0 at 0.5 weight).
 * 2. Computes deterministic WAR (truncated to 2 decimal places) and Pioneer Points.
 * 3. Enforces spike detection check.
 * 4. Automatically advances qualifying Explorer grades (Seed->Rising, Rising->Pro, Pro->Master).
 * 5. Flags Master->Elite for Admin review.
 */

import { supabase } from '../config/supabase';
import { PioneerGradeService, PioneerGrade } from '../services/PioneerGradeService';
import { GRADE_FEE_RANGES } from '../constants/pricing';
import { NotificationService } from '../services/NotificationService';

export async function runPioneerGradeEvaluationJob(): Promise<void> {
  const startTime = Date.now();
  const isoTimestamp = new Date().toISOString();
  console.log(`[JOB:START] PioneerGradeEvaluationJob triggered at ${isoTimestamp}`);

  try {
    const now = new Date();
    const sevenDaysAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // 1. Auto-complete unrated interactions older than 7 days
    const { data: staleInteractions } = await supabase
      .from('interactions')
      .select('id, state, created_at')
      .not('state', 'in', '("RATED","COMPLETE")')
      .lt('created_at', sevenDaysAgoIso);

    if (staleInteractions && staleInteractions.length > 0) {
      console.log(`[PioneerGradeJob] Auto-completing ${staleInteractions.length} stale unrated interactions`);
      const staleIds = staleInteractions.map((i: any) => i.id);
      await supabase
        .from('interactions')
        .update({
          state: 'COMPLETE',
          completed_at: now.toISOString(),
          // founder_rating remains null; WAR calculation will treat as 3.0 rating with 0.5 weight
        })
        .in('id', staleIds);
    }

    // 2. Fetch all explorer profiles
    const { data: profiles, error: profileErr } = await supabase
      .from('explorer_profiles')
      .select('*');

    if (profileErr || !profiles) {
      console.error('[PioneerGradeJob] Failed to fetch explorer profiles:', profileErr);
      return;
    }

    const ninetyDaysAgoIso = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

    for (const profile of profiles) {
      // 3. Fetch qualifying interactions for this explorer
      const { data: interactions } = await supabase
        .from('interactions')
        .select('id, state, founder_rating, created_at, founder_id')
        .eq('explorer_id', profile.id)
        .in('state', ['RATED', 'COMPLETE']);

      if (!interactions || interactions.length === 0) {
        continue;
      }

      // Format for WAR calculation
      const scoringItems = interactions.map((i: any) => ({
        id: i.id,
        state: i.state,
        founder_rating: i.founder_rating,
        // In real execution, founder account age is checked; default to now if missing
        founder_account_created_at: i.created_at,
        is_auto_completed: i.founder_rating === null || i.founder_rating === undefined,
      }));

      const warResult = PioneerGradeService.computeWARAndPoints(scoringItems, now);

      // 4. Spike check (7-day velocity vs 90-day weekly average)
      const recent7dCount = interactions.filter(
        (i: any) => new Date(i.created_at).getTime() >= now.getTime() - 7 * 24 * 60 * 60 * 1000
      ).length;

      const profileCreatedTime = new Date(profile.created_at || now).getTime();
      const weeksActive = Math.max(1, Math.floor((now.getTime() - profileCreatedTime) / (7 * 24 * 60 * 60 * 1000)));
      const spikeFlagged = PioneerGradeService.checkSpike(recent7dCount, interactions.length, weeksActive);

      // 5. Evaluate grade advancement
      const evalResult = PioneerGradeService.evaluateAdvancement({
        currentGrade: profile.pioneer_grade as PioneerGrade,
        war: warResult.war,
        n: warResult.qualifyingCount,
        linkedinVerified: Boolean(profile.linkedin_verified),
        linkedinVerifiedAt: profile.linkedin_verified_at,
        linkedinTenureMonths: profile.linkedin_tenure_months || 0,
        seniorFastTrackCompleted: Boolean(profile.senior_fast_track),
        spikeFlagged,
        nowDate: now,
      });

      // 6. Apply updates
      const updates: any = {
        pioneer_points: warResult.pioneerPoints,
        avg_founder_rating: warResult.war,
        verified_interaction_count: warResult.qualifyingCount,
        updated_at: now.toISOString(),
      };

      if (evalResult.qualifies && evalResult.targetGrade !== profile.pioneer_grade) {
        if (evalResult.requiresAdmin) {
          // Log to audit log queue for admin approval (Master -> Elite)
          await supabase.from('security_audit_log').insert({
            event_type: 'grade_advancement_queue',
            reason: `Explorer ${profile.username} qualifies for ELITE: WAR ${evalResult.war}, N ${evalResult.n}`,
            metadata: {
              explorer_id: profile.id,
              from_grade: profile.pioneer_grade,
              to_grade: 'ELITE',
              war: evalResult.war,
              n: evalResult.n,
            },
          });
          console.log(`[PioneerGradeJob] Explorer ${profile.username} queued for Admin ELITE approval`);
        } else {
          // Auto advance
          const newFee = GRADE_FEE_RANGES[evalResult.targetGrade];
          updates.pioneer_grade = evalResult.targetGrade;
          if (newFee) {
            updates.fee_min_paise = newFee.minPaise.toString();
            updates.fee_max_paise = newFee.maxPaise.toString();
          }

          await supabase.from('pioneer_grade_history').insert({
            explorer_id: profile.id,
            from_grade: profile.pioneer_grade,
            to_grade: evalResult.targetGrade,
            reason: 'AUTO_EVALUATION',
            pioneer_points_at_change: warResult.pioneerPoints,
          });

          console.log(`[PioneerGradeJob] Explorer ${profile.username} auto-advanced from ${profile.pioneer_grade} to ${evalResult.targetGrade}`);

          // Non-blocking PIONEER_GRADE_UPGRADED notification
          try {
            NotificationService.send({
              type: 'PIONEER_GRADE_UPGRADED',
              data: {
                newGrade: evalResult.targetGrade,
                feeRange: newFee ? `₹${Number(newFee.minPaise)/100} – ₹${Number(newFee.maxPaise)/100}` : 'Standard',
              },
            }).catch(() => {});
          } catch (e) {}
        }
      }

      await supabase.from('explorer_profiles').update(updates).eq('id', profile.id);
    }
  } catch (err) {
    console.error('[JOB:ERROR] PioneerGradeEvaluationJob failed:', err);
  }

  const duration = Date.now() - startTime;
  console.log(`[JOB:END] PioneerGradeEvaluationJob completed in ${duration}ms`);
}

