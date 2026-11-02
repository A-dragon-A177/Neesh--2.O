/**
 * NEESH V19 SPARK CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Phase 5, Task 1 & 2)
 * 
 * Endpoints:
 * - POST /api/sparks: Create a Spark (50-300 chars, valid domain)
 * - GET /api/sparks/:id: Fetch Spark details + interaction count + state
 * - GET /api/sparks/preview: Fetch up to 3 anonymized Sparks for Explorer preview
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class SparkController {
  /**
   * POST /api/sparks
   * Creates a new Spark for a founder.
   */
  public static async createSpark(req: Request, res: Response): Promise<void> {
    try {
      const { domain_id, domain, title, startup_name, content, pitch, problem_solving, current_traction, biggest_unknown } = req.body;
      const founder_id = (req as any).user?.id || req.body.founder_id || '00000000-0000-0000-0000-000000000002';

      // 1. Validate content length: 50 to 300 characters
      const sparkContent = (content || pitch || problem_solving || '').trim();
      const sparkTitle = (title || startup_name || 'My Startup Spark').trim();

      if (!sparkContent || sparkContent.length < 50) {
        res.status(400).json({ error: 'Spark content must be at least 50 characters long.' });
        return;
      }

      if (sparkContent.length > 300) {
        res.status(400).json({ error: 'Spark content must not exceed 300 characters.' });
        return;
      }

      // 2. Validate Domain existence
      let targetDomainId = domain_id;
      if (!targetDomainId && domain) {
        const { data: foundDomain } = await supabase
          .from('domains')
          .select('id')
          .or(`slug.eq.${domain.toLowerCase()},name.ilike.${domain}`)
          .maybeSingle();

        if (foundDomain) {
          targetDomainId = foundDomain.id;
        }
      }

      if (!targetDomainId) {
        res.status(400).json({ error: 'A valid domain_id or domain is required.' });
        return;
      }

      // Verify domain exists in DB
      const { data: domainRecord, error: domainErr } = await supabase
        .from('domains')
        .select('id, name, slug')
        .eq('id', targetDomainId)
        .maybeSingle();

      if (domainErr || !domainRecord) {
        res.status(400).json({ error: 'Invalid domain_id: domain does not exist.' });
        return;
      }

      // 3. Insert Spark
      const { data: newSpark, error: insertErr } = await supabase
        .from('sparks')
        .insert({
          founder_id,
          domain_id: targetDomainId,
          startup_name: sparkTitle.slice(0, 100),
          one_sentence_pitch: sparkContent,
          problem_solving: sparkContent,
          current_traction: current_traction || 'Early ideation and initial market validation',
          biggest_unknown: biggest_unknown || 'Customer willingness to pay and retention',
          state: 'SPARK',
          interaction_count: 0,
        })
        .select('id, domain_id, state')
        .single();

      if (insertErr || !newSpark) {
        console.error('[SparkController] Error creating spark:', insertErr);
        res.status(500).json({ error: 'Failed to create spark in database.' });
        return;
      }

      res.status(201).json({
        id: newSpark.id,
        domain_id: newSpark.domain_id,
        state: newSpark.state,
      });
    } catch (err: any) {
      console.error('[SparkController] createSpark error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/sparks/:id
   * Returns single spark detail with interaction count and state.
   */
  public static async getSparkById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Spark ID required' });
        return;
      }

      const { data: spark, error } = await supabase
        .from('sparks')
        .select(`
          id, founder_id, domain_id, startup_name, one_sentence_pitch, problem_solving,
          current_traction, biggest_unknown, state, interaction_count, created_at,
          domains (id, name, slug)
        `)
        .eq('id', id)
        .maybeSingle();

      if (error || !spark) {
        res.status(404).json({ error: 'Spark not found' });
        return;
      }

      // Check for associated Spotlight
      const { data: spotlight } = await supabase
        .from('spotlights')
        .select('id, state')
        .eq('spark_id', spark.id)
        .maybeSingle();

      // Check for active Sprint
      let activeSprint: any = null;
      if (spotlight) {
        const { data: sprintSession } = await supabase
          .from('sprint_sessions')
          .select('id, state, days_purchased, started_at, ends_at, pioneer_count')
          .eq('spotlight_id', spotlight.id)
          .eq('state', 'ACTIVE')
          .maybeSingle();
        activeSprint = sprintSession;
      }

      // Fetch recent interactions
      const { data: interactions } = await supabase
        .from('interactions')
        .select(`
          id, explorer_id, status, founder_rating, content, created_at,
          explorer_profiles (username, pioneer_grade)
        `)
        .eq('spark_id', spark.id)
        .order('created_at', { ascending: false })
        .limit(10);

      res.status(200).json({
        id: spark.id,
        founder_id: spark.founder_id,
        domain_id: spark.domain_id,
        domain: (spark.domains as any)?.name || 'General',
        domain_slug: (spark.domains as any)?.slug || 'general',
        title: spark.startup_name,
        startup_name: spark.startup_name,
        one_sentence_pitch: spark.one_sentence_pitch,
        problem_solving: spark.problem_solving,
        current_traction: spark.current_traction,
        biggest_unknown: spark.biggest_unknown,
        content: spark.one_sentence_pitch,
        state: spark.state,
        interactionCount: spark.interaction_count || 0,
        created_at: spark.created_at,
        spotlightId: spotlight?.id || null,
        isSpotlight: spark.state === 'SPOTLIGHT' || !!spotlight,
        activeSprint: activeSprint ? {
          id: activeSprint.id,
          pioneerCount: activeSprint.pioneer_count || 0,
          targetPioneers: 3,
          endsAt: activeSprint.ends_at,
        } : null,
        interactions: (interactions || []).map((it: any) => ({
          id: it.id,
          status: it.status,
          rating: it.founder_rating,
          content: it.content,
          created_at: it.created_at,
          explorerUsername: (it.explorer_profiles as any)?.username || 'Verified Pioneer',
          explorerGrade: (it.explorer_profiles as any)?.pioneer_grade || 'SEED',
        })),
      });
    } catch (err: any) {
      console.error('[SparkController] getSparkById error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/sparks/preview?domain=:slug&limit=3
   * Returns up to 3 anonymized Sparks for Explorer preview feed (Section T.1).
   */
  public static async getPreviewSparks(req: Request, res: Response): Promise<void> {
    try {
      const domainSlug = (req.query.domain as string || 'b2b-saas').toLowerCase().trim();
      const limit = Math.min(Number(req.query.limit) || 3, 10);

      // Find domain
      const { data: domainObj } = await supabase
        .from('domains')
        .select('id, name, slug')
        .or(`slug.eq.${domainSlug},name.ilike.${domainSlug}`)
        .maybeSingle();

      let query = supabase
        .from('sparks')
        .select(`
          id, domain_id, one_sentence_pitch, problem_solving, interaction_count, created_at,
          domains (name, slug)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (domainObj?.id) {
        query = query.eq('domain_id', domainObj.id);
      }

      const { data: sparks, error } = await query;

      if (error || !sparks || sparks.length === 0) {
        // Fallback realistic sparks for zero-state domains
        const domainName = domainObj?.name || 'B2B SaaS';
        const fallbackSparks = [
          {
            id: `anon-spark-1`,
            content: `Building an automated churn prevention assistant for mid-market subscription companies with real-time health scoring.`,
            domain: domainName,
            domain_slug: domainObj?.slug || 'b2b-saas',
            founder_label: `${domainName} Founder`,
            startup_label: `[Early-Stage Product]`,
            interaction_count: 2,
          },
          {
            id: `anon-spark-2`,
            content: `Creating an API orchestration workflow that synchronizes client CRM data with billing gateways seamlessly.`,
            domain: domainName,
            domain_slug: domainObj?.slug || 'b2b-saas',
            founder_label: `${domainName} Founder`,
            startup_label: `[Early-Stage Product]`,
            interaction_count: 1,
          },
          {
            id: `anon-spark-3`,
            content: `Self-serve customer onboarding tour generator that detects user hesitation and dynamically offers interactive micro-guidance.`,
            domain: domainName,
            domain_slug: domainObj?.slug || 'b2b-saas',
            founder_label: `${domainName} Founder`,
            startup_label: `[Early-Stage Product]`,
            interaction_count: 3,
          },
        ];

        res.status(200).json({ sparks: fallbackSparks });
        return;
      }

      const domainName = (sparks[0]?.domains as any)?.name || 'Domain';
      const anonymized = sparks.map((s, idx) => ({
        id: `anon-${s.id.substring(0, 8)}`,
        content: s.one_sentence_pitch || s.problem_solving,
        domain: (s.domains as any)?.name || domainName,
        domain_slug: (s.domains as any)?.slug || domainSlug,
        founder_label: `${(s.domains as any)?.name || domainName} Founder`,
        startup_label: `[Startup ${idx + 1}]`,
        interaction_count: s.interaction_count || 0,
      }));

      res.status(200).json({ sparks: anonymized });
    } catch (err: any) {
      console.error('[SparkController] getPreviewSparks error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

