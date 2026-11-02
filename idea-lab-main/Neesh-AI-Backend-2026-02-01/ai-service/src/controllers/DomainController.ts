/**
 * NEESH V19 DOMAIN CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section N, Y.7, Section U.1)
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { DomainGatingService } from '../services/DomainGatingService';

export class DomainController {
  /**
   * GET /api/domains
   * Public list of domains with status and active founder counts.
   */
  public static async listDomains(req: Request, res: Response): Promise<void> {
    try {
      const { data: domains, error } = await supabase
        .from('domains')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('[DomainController] listDomains DB error:', error);
        res.status(500).json({ error: 'Internal server error' });
        return;
      }

      res.status(200).json({ domains: domains || [] });
    } catch (err: any) {
      console.error('[DomainController] listDomains error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/domains/:slug
   * Public single domain status and Section U.1 Proof Metrics.
   */
  public static async getDomainBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const normalizedSlug = (slug || '').trim().toLowerCase();

      const { data: domain } = await supabase
        .from('domains')
        .select('*')
        .eq('slug', normalizedSlug)
        .maybeSingle();

      if (!domain) {
        res.status(404).json({ error: `Domain '${slug}' not found` });
        return;
      }

      const status = await DomainGatingService.evaluateDomainStatus(domain.id);
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // 1. Active Spotlights in this domain
      const { count: spotlightCount } = await supabase
        .from('spotlights')
        .select('*', { count: 'exact', head: true })
        .or(`domain.eq.${domain.slug},domain.eq.${domain.name}`)
        .in('state', ['ACTIVE', 'SPRINT_ACTIVE']);

      // 2. Active Explorers (updated in last 7 days & not suspended) and grade breakdown
      const { data: activeExplorers } = await supabase
        .from('explorer_profiles')
        .select('pioneer_grade')
        .or(`domain.eq.${domain.slug},domain.eq.${domain.name}`)
        .neq('pioneer_grade', 'SUSPENDED')
        .gt('updated_at', sevenDaysAgo);

      const gradeBreakdown = {
        SEED: 0,
        RISING: 0,
        PRO: 0,
        MASTER: 0,
        ELITE: 0,
      };

      if (activeExplorers && activeExplorers.length > 0) {
        for (const exp of activeExplorers) {
          const g = (exp.pioneer_grade || 'SEED').toUpperCase() as keyof typeof gradeBreakdown;
          if (gradeBreakdown[g] !== undefined) {
            gradeBreakdown[g]++;
          } else {
            gradeBreakdown.SEED++;
          }
        }
      }

      // 3. Weekly Interactions in this domain (created_at > 7 days ago)
      const { count: interactionCount } = await supabase
        .from('interactions')
        .select('*, spotlights!inner(domain)', { count: 'exact', head: true })
        .or(`spotlights.domain.eq.${domain.slug},spotlights.domain.eq.${domain.name}`)
        .gt('created_at', sevenDaysAgo);

      const activeExplorerCount = activeExplorers?.length || domain.active_explorer_count || 0;
      const activeSpotlightCount = spotlightCount ?? domain.active_sprint_founder_count ?? 0;
      const weeklyInteractionCount = interactionCount ?? 0;

      res.status(200).json({
        ...status,
        activeSpotlightCount,
        activeExplorerCount,
        weeklyInteractionCount,
        gradeBreakdown,
      });
    } catch (err: any) {
      console.error('[DomainController] getDomainBySlug error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/domains/:slug/waitlist
   * Joins the Explorer waitlist for a closed domain.
   */
  public static async joinWaitlist(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const { email } = req.body || {};

      if (!email) {
        res.status(400).json({ error: 'email is required' });
        return;
      }

      const result = await DomainGatingService.joinWaitlist(slug, email);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to join waitlist' });
    }
  }
}
