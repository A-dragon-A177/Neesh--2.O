/**
 * NEESH V19 INTERACTION SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section U, Section V, Section W, Section AC, Section K.1)
 * 
 * Non-negotiable rules:
 * 1. Interaction content must strictly be between 100 and 2000 characters.
 * 2. Self-interaction is forbidden (founder cannot interact with their own spotlight/spark).
 * 3. Domain match is validated (explorer domain must match spotlight/spark domain).
 * 4. Duplicate prevention: only 1 active interaction per (explorer, spotlight) pair.
 * 5. Founder rating must be an integer between 1 and 5; rating is idempotent.
 * 6. Rating increments sprint pioneer_count if explorer is Rising+ Pioneer.
 * 7. Rating direct request interactions releases escrow via DirectRequestService.
 * 8. All lifecycle transitions record immutable audit rows in interaction_events.
 */

import { supabase } from '../config/supabase';
import { NotificationService } from './NotificationService';
import { DirectRequestService } from './DirectRequestService';
import { LedgerService } from './LedgerService';

export interface SubmitInteractionInput {
  founderId: string;
  explorerId: string; // explorer_profiles.id
  spotlightId?: string;
  sparkId?: string;
  content: string;
  interactionType?: 'ORGANIC' | 'DIRECT_REQUEST' | 'TEST';
  requestedFeePaise?: bigint;
}

export class InteractionService {
  /**
   * Submits a new interaction with length, self-interaction, domain match, and uniqueness checks.
   */
  public static async submitInteraction(input: SubmitInteractionInput) {
    const {
      founderId,
      explorerId,
      spotlightId,
      sparkId,
      content,
      interactionType = 'ORGANIC',
    } = input;

    if (!founderId || !explorerId) {
      throw new Error('founderId and explorerId are required');
    }

    if (!spotlightId && !sparkId) {
      throw new Error('Either spotlightId or sparkId is required');
    }

    // 1. Content length validation (100 to 2000 chars)
    const trimmedContent = (content || '').trim();
    if (trimmedContent.length < 100 || trimmedContent.length > 2000) {
      throw new Error(
        `Interaction content must be between 100 and 2000 characters (current length: ${trimmedContent.length})`
      );
    }

    // 2. Fetch explorer profile & prevent self-interaction
    const { data: explorer, error: explorerError } = await supabase
      .from('explorer_profiles')
      .select('id, user_id, domain, state, pioneer_grade')
      .eq('id', explorerId)
      .maybeSingle();

    if (explorerError || !explorer) {
      throw new Error(`Explorer profile not found: ${explorerError?.message || explorerId}`);
    }

    if (explorer.user_id === founderId) {
      throw new Error('Self-interaction forbidden: Founder cannot submit an explorer interaction on their own idea');
    }

    // V20: Fee calibration by Pioneer Grade
    // Scout grade interactions have fee_paise = 0 — completely free, no payment, no escrow, no ledger entries
    const isScoutGrade = explorer.pioneer_grade === 'SCOUT';
    const effectiveFeePaise = isScoutGrade ? 0n : (input.requestedFeePaise || 0n);

    // 3. Domain match check
    let targetDomain: string | null = null;
    let targetFounderId: string | null = null;

    if (spotlightId) {
      const { data: spotlight, error: spotError } = await supabase
        .from('spotlights')
        .select('domain, founder_id')
        .eq('id', spotlightId)
        .maybeSingle();

      if (spotError || !spotlight) {
        throw new Error(`Spotlight not found: ${spotlightId}`);
      }
      targetDomain = spotlight.domain;
      targetFounderId = spotlight.founder_id;
    } else if (sparkId) {
      const { data: spark, error: sparkError } = await supabase
        .from('sparks')
        .select('domain, founder_id')
        .eq('id', sparkId)
        .maybeSingle();

      if (sparkError || !spark) {
        throw new Error(`Spark not found: ${sparkId}`);
      }
      targetDomain = spark.domain;
      targetFounderId = spark.founder_id;
    }

    if (targetFounderId && targetFounderId !== founderId) {
      throw new Error('Mismatched founderId: Does not match target spotlight/spark owner');
    }

    if (targetDomain && explorer.domain && targetDomain !== explorer.domain) {
      throw new Error(`Domain mismatch: Explorer is committed to '${explorer.domain}', target is '${targetDomain}'`);
    }

    // 4. Duplicate prevention: Check for active interaction
    if (spotlightId) {
      const { data: existingActive } = await supabase
        .from('interactions')
        .select('id, state')
        .eq('explorer_id', explorerId)
        .eq('spotlight_id', spotlightId)
        .in('state', ['PENDING', 'RESPONDED'])
        .maybeSingle();

      if (existingActive) {
        throw new Error('Duplicate active interaction: An interaction with this explorer is already pending or responded');
      }
    }

    // 5. Insert interaction
    const { data: interaction, error: insertError } = await supabase
      .from('interactions')
      .insert({
        spotlight_id: spotlightId || null,
        spark_id: sparkId || null,
        founder_id: founderId,
        explorer_id: explorerId,
        content: trimmedContent,
        interaction_type: interactionType,
        state: 'PENDING',
      })
      .select()
      .single();

    if (insertError || !interaction) {
      throw new Error(`Failed to submit interaction: ${insertError?.message}`);
    }

    // 6. Record interaction_events audit row
    await supabase.from('interaction_events').insert({
      interaction_id: interaction.id,
      event_type: 'SUBMITTED',
    });

    // 6b. V20: Escrow hold for paid interactions (skipped completely if fee_paise is 0 / SCOUT)
    if (effectiveFeePaise > 0n) {
      await LedgerService.createEntry({
        entryType: 'ESCROW_HOLD',
        direction: 'DEBIT',
        amountPaise: effectiveFeePaise,
        userId: founderId,
        referenceType: 'INTERACTION',
        referenceId: interaction.id,
        idempotencyKey: `ESCROW_HOLD_INT_${interaction.id}`,
        status: 'COMPLETED',
        metadata: {
          explorer_id: explorerId,
          fee_paise: effectiveFeePaise.toString(),
        },
      });
    }

    // 7. Non-blocking SPARK_FIRST_INTERACTION notification
    try {
      if (sparkId) {
        await NotificationService.send({
          type: 'SPARK_FIRST_INTERACTION',
          data: {
            sparkId,
            content: trimmedContent,
            domain: targetDomain || 'Startup',
          },
        });
      }
    } catch (notifErr) {
      console.error('[InteractionService] Non-blocking notification error:', notifErr);
    }

    return interaction;
  }

  /**
   * Founder responds to an interaction.
   */
  public static async respondToInteraction(
    interactionId: string,
    founderId: string,
    responseText: string
  ) {
    if (!interactionId || !founderId) {
      throw new Error('interactionId and founderId are required');
    }

    const trimmedResponse = (responseText || '').trim();
    if (!trimmedResponse) {
      throw new Error('Response text cannot be empty');
    }

    const { data: interaction, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', interactionId)
      .maybeSingle();

    if (error || !interaction) {
      throw new Error(`Interaction not found: ${interactionId}`);
    }

    if (interaction.founder_id !== founderId) {
      throw new Error('Unauthorized: Only the founder can respond to this interaction');
    }

    if (interaction.state !== 'PENDING') {
      throw new Error(`Cannot respond to interaction in state '${interaction.state}' (must be PENDING)`);
    }

    const { data: updated, error: updateError } = await supabase
      .from('interactions')
      .update({
        founder_response: trimmedResponse,
        state: 'RESPONDED',
      })
      .eq('id', interactionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update interaction response: ${updateError.message}`);
    }

    // Record event
    await supabase.from('interaction_events').insert({
      interaction_id: interactionId,
      event_type: 'RESPONDED',
    });

    return updated;
  }

  /**
   * Founder rates an interaction with 1-5 integer stars. Idempotent.
   */
  public static async rateInteraction(
    interactionId: string,
    founderId: string,
    rating: number
  ) {
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new Error(`Rating must be an integer between 1 and 5 (got: ${rating})`);
    }

    const { data: interaction, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', interactionId)
      .maybeSingle();

    if (error || !interaction) {
      throw new Error(`Interaction not found: ${interactionId}`);
    }

    if (interaction.founder_id !== founderId) {
      throw new Error('Unauthorized: Only the founder can rate this interaction');
    }

    // Idempotency: If already rated, return existing
    if (interaction.state === 'RATED' || interaction.state === 'COMPLETE') {
      return interaction;
    }

    const nowIso = new Date().toISOString();

    const { data: updated, error: updateError } = await supabase
      .from('interactions')
      .update({
        founder_rating: rating,
        state: 'RATED',
        completed_at: nowIso,
      })
      .eq('id', interactionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to rate interaction: ${updateError.message}`);
    }

    // Record audit event
    await supabase.from('interaction_events').insert({
      interaction_id: interactionId,
      event_type: 'RATED',
    });

    // 1. Update sprint pioneer count if eligible
    if (interaction.spotlight_id) {
      await this.evaluateSprintPioneerIncrement(interaction.spotlight_id, interaction.explorer_id);
    }

    // 2. Release escrow if linked to a direct request
    const { data: directReq } = await supabase
      .from('direct_requests')
      .select('id, state')
      .eq('interaction_id', interactionId)
      .maybeSingle();

    if (directReq && directReq.state !== 'COMPLETED') {
      await DirectRequestService.completePaidInteraction(directReq.id);
    }

    return updated;
  }

  /**
   * Increments pioneer_count on active sprint session if explorer is Rising+ grade.
   */
  private static async evaluateSprintPioneerIncrement(spotlightId: string, explorerId: string) {
    try {
      const { data: explorer } = await supabase
        .from('explorer_profiles')
        .select('pioneer_grade')
        .eq('id', explorerId)
        .maybeSingle();

      const grade = explorer?.pioneer_grade;
      // V20: SCOUT interactions do NOT count as Pioneer-grade interactions for Sprint Guarantee evaluation
      if (!grade || grade === 'SCOUT') {
        return;
      }
      const isRisingOrHigher = ['RISING', 'PRO', 'MASTER', 'ELITE'].includes(grade || '');

      if (!isRisingOrHigher) {
        return; // Seed grade does not count towards 3+ Pioneer guarantee threshold
      }

      const { data: sprintSession } = await supabase
        .from('sprint_sessions')
        .select('id, pioneer_count, state')
        .eq('spotlight_id', spotlightId)
        .eq('state', 'ACTIVE')
        .maybeSingle();

      if (sprintSession) {
        const currentCount = sprintSession.pioneer_count || 0;
        await supabase
          .from('sprint_sessions')
          .update({ pioneer_count: currentCount + 1 })
          .eq('id', sprintSession.id);
      }
    } catch (err) {
      console.warn('[InteractionService] Sprint pioneer increment check failed:', err);
    }
  }

  /**
   * Auto-completes an interaction that has remained unrated for > 7 days after response.
   */
  public static async autoCompleteInteraction(interactionId: string) {
    const { data: interaction, error } = await supabase
      .from('interactions')
      .select('*')
      .eq('id', interactionId)
      .maybeSingle();

    if (error || !interaction) {
      throw new Error(`Interaction not found: ${interactionId}`);
    }

    if (interaction.state === 'COMPLETE' || interaction.state === 'RATED') {
      return interaction;
    }

    const { data: updated, error: updateError } = await supabase
      .from('interactions')
      .update({
        state: 'COMPLETE',
        founder_rating: null, // Treated as 3.0 at 0.5 weight in PioneerGradeService
        completed_at: new Date().toISOString(),
      })
      .eq('id', interactionId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to auto-complete interaction: ${updateError.message}`);
    }

    await supabase.from('interaction_events').insert({
      interaction_id: interactionId,
      event_type: 'AUTO_COMPLETED',
    });

    // Check direct request escrow release
    const { data: directReq } = await supabase
      .from('direct_requests')
      .select('id, state')
      .eq('interaction_id', interactionId)
      .maybeSingle();

    if (directReq && directReq.state !== 'COMPLETED') {
      await DirectRequestService.completePaidInteraction(directReq.id);
    }

    return updated;
  }
}

