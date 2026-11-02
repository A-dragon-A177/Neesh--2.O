/**
 * NEESH V19 DIRECT REQUEST CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section K.1, Section W.3, Section W.5, Section Y)
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { DirectRequestService } from '../services/DirectRequestService';

export class DirectRequestController {
  /**
   * POST /api/direct-requests
   * Founder initiates a Direct Request with locked explorer fee.
   */
  public static async create(req: Request, res: Response): Promise<void> {
    try {
      const founderId = (req as any).user?.id || (req as any).user?.sub;
      if (!founderId) {
        res.status(401).json({ error: 'Unauthorized: Authentication required' });
        return;
      }

      const body = req.body || {};
      const { explorerId, spotlightId, message, applyBalance } = body;

      const result = await DirectRequestService.createDirectRequest({
        founderId,
        explorerId,
        spotlightId,
        message,
        applyBalance,
      });

      res.status(201).json({
        success: true,
        ...result,
      });
    } catch (err: any) {
      console.error('[DirectRequestController] Create exception:', err);
      const isValidation = err.message?.includes('characters') || err.message?.includes('required');
      res.status(isValidation ? 400 : 500).json({ error: err.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/direct-requests/:id/accept
   * Explorer accepts a Direct Request -> generates linked interaction.
   */
  public static async accept(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const { data: explorer, error } = await supabase
        .from('explorer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !explorer) {
        res.status(403).json({ error: 'Forbidden: Only the target explorer can accept this request' });
        return;
      }

      const result = await DirectRequestService.acceptDirectRequest(id, explorer.id);

      res.status(200).json({
        success: true,
        ...result,
        message: 'Direct request accepted. Interaction thread created.',
      });
    } catch (err: any) {
      console.error('[DirectRequestController] Accept exception:', err);
      res.status(err.message?.includes('Unauthorized') ? 403 : 400).json({ error: err.message });
    }
  }

  /**
   * POST /api/direct-requests/:id/decline
   * Explorer declines a Direct Request -> returns escrow to Founder.
   */
  public static async decline(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;

      const { data: explorer, error } = await supabase
        .from('explorer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (error || !explorer) {
        res.status(403).json({ error: 'Forbidden: Only the target explorer can decline this request' });
        return;
      }

      const updated = await DirectRequestService.declineDirectRequest(id, explorer.id);

      res.status(200).json({
        success: true,
        directRequest: updated,
        message: 'Direct request declined. Escrow has been returned to the founder.',
      });
    } catch (err: any) {
      console.error('[DirectRequestController] Decline exception:', err);
      res.status(err.message?.includes('Unauthorized') ? 403 : 400).json({ error: err.message });
    }
  }

  /**
   * GET /api/direct-requests/inbox
   * Explorer retrieves their incoming Direct Requests.
   */
  public static async getInbox(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || (req as any).user?.sub;
      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { data: explorer } = await supabase
        .from('explorer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!explorer) {
        res.status(403).json({ error: 'Forbidden: Explorer profile not found' });
        return;
      }

      const { data: requests, error } = await supabase
        .from('direct_requests')
        .select('*, spotlights(title, domain)')
        .eq('explorer_id', explorer.id)
        .order('created_at', { ascending: false });

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(200).json({
        requests: requests || [],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal Server Error' });
    }
  }
}

