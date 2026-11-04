/**
 * NEESH V19 INTERACTION CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section U, Section V, Section W, Section AC)
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { InteractionService } from '../services/InteractionService';

export class InteractionController {
  /**
   * POST /api/interactions
   * Explorer submits feedback/insight on a spark or spotlight.
   */
  public static async submit(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      // Resolve explorer profile id for this user
      const { data: explorer, error: explorerErr } = await supabase
        .from('explorer_profiles')
        .select('id, user_id, state')
        .eq('user_id', userId)
        .maybeSingle();

      if (explorerErr || !explorer) {
        res.status(403).json({ error: 'Forbidden: Only verified explorers can submit interactions' });
        return;
      }

      const body = req.body || {};
      const { spotlightId, sparkId, content, founderId, interactionType } = body;

      const interaction = await InteractionService.submitInteraction({
        founderId,
        explorerId: explorer.id,
        spotlightId,
        sparkId,
        content,
        interactionType,
      });

      res.status(201).json({
        success: true,
        interaction,
        message: 'Interaction submitted successfully',
      });
    } catch (err: any) {
      console.error('[InteractionController] Submit exception:', err);
      const isValidationErr =
        err.message?.includes('characters') ||
        err.message?.includes('Self-interaction') ||
        err.message?.includes('Duplicate') ||
        err.message?.includes('Domain mismatch');

      res.status(isValidationErr ? 400 : 500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/interactions/:id/respond
   * Founder responds to an interaction.
   */
  public static async respond(req: Request, res: Response): Promise<void> {
    try {
      const founderId = req.user?.id;
      if (!founderId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const { id } = req.params;
      const { response: responseText, responseText: altResponse } = req.body || {};
      const responseContent = responseText || altResponse;

      if (!responseContent) {
        res.status(400).json({ error: 'Response content is required' });
        return;
      }

      const updated = await InteractionService.respondToInteraction(id, founderId, responseContent);

      res.status(200).json({
        success: true,
        interaction: updated,
        message: 'Response recorded',
      });
    } catch (err: any) {
      console.error('[InteractionController] Respond exception:', err);
      res.status(err.message?.includes('Unauthorized') ? 403 : 400).json({ error: err.message });
    }
  }

  /**
   * POST /api/interactions/:id/rate
   * Founder rates an interaction 1-5 stars.
   */
  public static async rate(req: Request, res: Response): Promise<void> {
    try {
      const founderId = req.user?.id;
      if (!founderId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const { id } = req.params;
      const { rating } = req.body || {};

      const ratingInt = parseInt(rating, 10);
      if (isNaN(ratingInt) || ratingInt < 1 || ratingInt > 5) {
        res.status(400).json({ error: 'Rating must be an integer between 1 and 5' });
        return;
      }

      const updated = await InteractionService.rateInteraction(id, founderId, ratingInt);

      res.status(200).json({
        success: true,
        interaction: updated,
        message: 'Rating submitted',
      });
    } catch (err: any) {
      console.error('[InteractionController] Rate exception:', err);
      res.status(err.message?.includes('Unauthorized') ? 403 : 400).json({ error: err.message });
    }
  }

  /**
   * GET /api/interactions/:id
   * Retrieves interaction and its timeline event history.
   */
  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const { data: interaction, error } = await supabase
        .from('interactions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !interaction) {
        res.status(404).json({ error: 'Interaction not found' });
        return;
      }

      const { data: events } = await supabase
        .from('interaction_events')
        .select('*')
        .eq('interaction_id', id)
        .order('created_at', { ascending: true });

      res.status(200).json({
        interaction,
        events: events || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
}

