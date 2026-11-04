/**
 * NEESH V19 EXPLORER CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Sections L, N, O, P, T)
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { DomainGatingService } from '../services/DomainGatingService';
import { ExplorerService, LinkedInRole } from '../services/ExplorerService';
import { PioneerGradeService } from '../services/PioneerGradeService';

export class ExplorerController {
  /**
   * GET /api/explorer/onboarding
   * Checks domain commitment status before allowing LinkedIn prompt.
   * Query: ?domain=<slug>
   */
  public static async checkOnboarding(req: Request, res: Response): Promise<void> {
    try {
      const domainSlug = (req.query.domain as string) || (req.query.slug as string);
      if (!domainSlug) {
        res.status(400).json({ error: 'domain query parameter is required' });
        return;
      }

      const { data: domain } = await supabase
        .from('domains')
        .select('*')
        .eq('slug', domainSlug.trim().toLowerCase())
        .maybeSingle();

      if (!domain) {
        res.status(404).json({ error: `Domain '${domainSlug}' not found` });
        return;
      }

      const status = await DomainGatingService.evaluateDomainStatus(domain.id);
      res.status(200).json(status);
    } catch (err: any) {
      console.error('[ExplorerController] checkOnboarding error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/explorer/signup
   * Initiates Explorer registration.
   */
  public static async signup(req: Request, res: Response): Promise<void> {
    try {
      const { email, domainSlug, displayName } = req.body || {};
      if (!email || !domainSlug) {
        res.status(400).json({ error: 'email and domainSlug are required' });
        return;
      }

      const { data: domain } = await supabase
        .from('domains')
        .select('id, name, slug, explorer_signup_open')
        .eq('slug', domainSlug.trim().toLowerCase())
        .maybeSingle();

      if (!domain) {
        res.status(404).json({ error: `Domain '${domainSlug}' not found` });
        return;
      }

      const status = await DomainGatingService.evaluateDomainStatus(domain.id);
      if (!status.isOpen) {
        res.status(403).json({
          error: 'DomainClosed',
          message: `${domain.name} is currently closed. ${status.activeFounderCount} of 5 needed paying founders active.`,
          activeFounderCount: status.activeFounderCount,
          neededFounders: 5,
          waitlistPrompt: true,
        });
        return;
      }

      // Domain is open -> proceed to LinkedIn verification
      res.status(200).json({
        success: true,
        message: 'Domain is open. Proceed to LinkedIn verification.',
        domainId: domain.id,
        nextStep: 'LINKEDIN_VERIFY',
      });
    } catch (err: any) {
      console.error('[ExplorerController] signup error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/explorer/linkedin-verify
   * Receives LinkedIn roles, parses tenure, creates explorer_profiles row,
   * performs cumulative Founding Explorer check (<65), and evaluates Senior Fast-Track.
   */
  public static async verifyLinkedIn(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const {
        domainSlug,
        username,
        displayName,
        roles = [] as LinkedInRole[],
        linkedinProfileUrl,
        bio,
      } = req.body || {};

      if (!domainSlug || !username) {
        res.status(400).json({ error: 'domainSlug and username are required' });
        return;
      }

      const { data: domain } = await supabase
        .from('domains')
        .select('id, name')
        .eq('slug', domainSlug.trim().toLowerCase())
        .maybeSingle();

      if (!domain) {
        res.status(404).json({ error: `Domain '${domainSlug}' not found` });
        return;
      }

      // 1. Parse tenure per Section P.0
      const tenureResult = ExplorerService.calculateTenureMonths(roles);

      // 2. Insert or update explorer_profiles
      // V20: General new Explorer starts as SCOUT. Senior Fast-Track starts at PRO.
      // Default for new explorers is 'SCOUT' (set at application layer)
      // Database column default remains 'SEED' for legacy safety
      const initialGrade = tenureResult.isSeniorFastTrackEligible ? 'PRO' : 'SCOUT';
      const initialFeeMin = tenureResult.isSeniorFastTrackEligible ? '80000' : '0';
      const initialFeeMax = tenureResult.isSeniorFastTrackEligible ? '300000' : '0';

      const profileData: any = {
        user_id: userId,
        username: username.trim().toLowerCase(),
        display_name: displayName || username,
        domain_id: domain.id,
        pioneer_grade: initialGrade,
        linkedin_verified: true,
        linkedin_verified_at: new Date().toISOString(),
        linkedin_domain_tenure_years: tenureResult.qualifyingYears,
        linkedin_tenure_months: tenureResult.totalQualifyingMonths,
        linkedin_profile_url: linkedinProfileUrl || null,
        bio: bio || null,
        fee_min_paise: initialFeeMin,
        fee_max_paise: initialFeeMax,
        senior_fast_track: tenureResult.isSeniorFastTrackEligible,
      };

      const { data: profile, error: profileError } = await supabase
        .from('explorer_profiles')
        .upsert(profileData, { onConflict: 'user_id' })
        .select()
        .single();

      if (profileError || !profile) {
        console.error('[ExplorerController] Failed to save explorer profile:', profileError);
        res.status(500).json({ error: `Failed to save profile: ${profileError?.message}` });
        return;
      }

      // 3. Founding Explorer cumulative platform-wide check (Section O.2)
      const foundingResult = await ExplorerService.checkAndEnrollFoundingExplorer(profile.id);
      const effectiveGrade = foundingResult.enrolled && initialGrade === 'SCOUT' ? 'SEED' : initialGrade;

      // 4. Return profile state + eligibility
      res.status(200).json({
        profileId: profile.id,
        username: profile.username,
        grade: effectiveGrade,
        tenureMonths: tenureResult.totalQualifyingMonths,
        isFoundingExplorer: foundingResult.enrolled,
        foundingEnrollmentNumber: foundingResult.enrollmentNumber || null,
        commissionFreeUntil: foundingResult.commissionFreeUntil || null,
        seniorFastTrackEligible: tenureResult.isSeniorFastTrackEligible,
        requiresManualReview: tenureResult.requiresManualReview,
      });
    } catch (err: any) {
      console.error('[ExplorerController] verifyLinkedIn error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/explorer/senior-fast-track/choice
   * Explorer chooses "CONTINUE" (test interaction) or "RISING_INSTEAD".
   */
  public static async chooseFastTrack(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      const { choice } = req.body || {};

      if (choice !== 'CONTINUE' && choice !== 'RISING_INSTEAD') {
        res.status(400).json({ error: "choice must be 'CONTINUE' or 'RISING_INSTEAD'" });
        return;
      }

      const { data: profile } = await supabase
        .from('explorer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        res.status(404).json({ error: 'Explorer profile not found' });
        return;
      }

      const result = await ExplorerService.handleFastTrackChoice(profile.id, choice);
      res.status(200).json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/explorer/verify-linkedin
   * Validates LinkedIn URL format, duplicate check, and checks Senior Fast-Track candidate status.
   */
  public static async verifyLinkedInUrl(req: Request, res: Response): Promise<void> {
    try {
      const { linkedinUrl, url, yearsInDomain } = req.body || {};
      const targetUrl = (linkedinUrl || url || '').trim();

      // Validate URL format: must match linkedin.com/in/[username]
      const linkedInPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\.\%]+\/?$/i;
      if (!targetUrl || !linkedInPattern.test(targetUrl)) {
        res.status(400).json({
          valid: false,
          error: 'Invalid LinkedIn URL format. Must be https://linkedin.com/in/[username]',
        });
        return;
      }

      // Check for existing profile with this LinkedIn URL (prevent duplicates)
      const { data: existingProfile } = await supabase
        .from('explorer_profiles')
        .select('id, user_id')
        .eq('linkedin_profile_url', targetUrl)
        .maybeSingle();

      if (existingProfile) {
        res.status(409).json({
          valid: false,
          error: 'This LinkedIn profile is already registered with another Explorer account.',
        });
        return;
      }

      const monthsExperience = req.body?.monthsExperience !== undefined
        ? Number(req.body.monthsExperience)
        : (Number(yearsInDomain) || 1) * 12;
      const isSeniorCandidate = ExplorerService.isSeniorCandidate(monthsExperience);
      const years = Math.max(1, Math.min(40, Math.floor(monthsExperience / 12)));
      const isSeniorFastTrack = isSeniorCandidate;

      res.status(200).json({
        valid: true,
        isSeniorFastTrack,
        isSeniorCandidate,
        monthsExperience,
        yearsInDomain: years,
        message: isSeniorFastTrack
          ? 'Eligible for Senior Fast-Track (5+ years in domain).'
          : 'Standard verification passed.',
      });
    } catch (err: any) {
      console.error('[ExplorerController] verifyLinkedInUrl error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * POST /api/explorer/enroll
   * Enrolls an Explorer, sets initial Pioneer grade, and awards Founding Explorer status if cap < 65.
   */
  public static async enrollExplorer(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.body?.userId || '00000000-0000-0000-0000-000000000003';
      const {
        domainId,
        domainSlug,
        username,
        displayName,
        linkedinUrl,
        yearsInDomain = 1,
        startAsRising = false,
      } = req.body || {};

      let resolvedDomainId = domainId;
      if (!resolvedDomainId && domainSlug) {
        const { data: domain } = await supabase
          .from('domains')
          .select('id')
          .eq('slug', domainSlug.trim().toLowerCase())
          .maybeSingle();
        if (domain) resolvedDomainId = domain.id;
      }

      const years = Number(yearsInDomain) || 1;
      // V20: General new Explorer starts as SCOUT (0n fee).
      // Senior Fast-Track (>= 5 years / 60 months) starts at PRO.
      // Default for new explorers is 'SCOUT' (set at application layer)
      // Database column default remains 'SEED' for legacy safety
      let initialGrade: 'SCOUT' | 'SEED' | 'RISING' | 'PRO' = 'SCOUT';
      let feeMin = '0';
      let feeMax = '0';
      let isSeniorFastTrack = false;

      if (years >= 5 && !startAsRising) {
        initialGrade = 'PRO';
        feeMin = '80000';  // ₹800
        feeMax = '300000'; // ₹3,000
        isSeniorFastTrack = true;
      } else if (years >= 3 || startAsRising) {
        initialGrade = 'RISING';
        feeMin = '20000';  // ₹200
        feeMax = '80000';  // ₹800
      } else {
        initialGrade = 'SCOUT';
        feeMin = '0';
        feeMax = '0';
      }

      const cleanUsername = (username || `pioneer_${Date.now().toString().slice(-6)}`).toLowerCase().trim();
      const cleanDisplayName = displayName || cleanUsername;

      // Upsert explorer profile
      const { data: profile, error: profileErr } = await supabase
        .from('explorer_profiles')
        .upsert(
          {
            user_id: userId,
            domain_id: resolvedDomainId,
            username: cleanUsername,
            display_name: cleanDisplayName,
            linkedin_profile_url: linkedinUrl || null,
            linkedin_verified: true,
            linkedin_verified_at: new Date().toISOString(),
            linkedin_domain_tenure_years: years,
            linkedin_tenure_months: years * 12,
            pioneer_grade: initialGrade,
            fee_min_paise: feeMin,
            fee_max_paise: feeMax,
            senior_fast_track: isSeniorFastTrack,
          },
          { onConflict: 'user_id' }
        )
        .select('id, user_id, username, pioneer_grade, display_name')
        .single();

      if (profileErr || !profile) {
        console.error('[ExplorerController] Failed to enroll explorer:', profileErr);
        res.status(500).json({ error: 'Failed to create explorer profile' });
        return;
      }

      // Check Founding Explorer status
      const foundingResult = await ExplorerService.checkAndEnrollFoundingExplorer(profile.id);
      const returnGrade = foundingResult.enrolled && initialGrade === 'SCOUT' ? 'SEED' : profile.pioneer_grade;

      res.status(201).json({
        profileId: profile.id,
        username: profile.username,
        pioneerGrade: returnGrade,
        isFoundingExplorer: foundingResult.enrolled,
        foundingPosition: foundingResult.enrollmentNumber || null,
        commissionFreeUntil: foundingResult.commissionFreeUntil || null,
      });
    } catch (err: any) {
      console.error('[ExplorerController] enrollExplorer error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/explorer/founding-status
   * Returns Founding Explorer status for authenticated explorer.
   */
  public static async getFoundingStatus(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.query.userId;
      if (!userId) {
        res.status(200).json({
          isFoundingExplorer: false,
          position: null,
          commissionFreeUntil: null,
        });
        return;
      }

      const { data: profile } = await supabase
        .from('explorer_profiles')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile) {
        res.status(200).json({
          isFoundingExplorer: false,
          position: null,
          commissionFreeUntil: null,
        });
        return;
      }

      const { data: founding } = await supabase
        .from('founding_explorer_registrations')
        .select('id, enrollment_order, commission_free_until')
        .eq('explorer_id', profile.id)
        .maybeSingle();

      if (founding) {
        res.status(200).json({
          isFoundingExplorer: true,
          position: founding.enrollment_order,
          commissionFreeUntil: founding.commission_free_until,
        });
        return;
      }

      res.status(200).json({
        isFoundingExplorer: false,
        position: null,
        commissionFreeUntil: null,
      });
    } catch (err: any) {
      console.error('[ExplorerController] getFoundingStatus error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/explorer/profile/:username
   * Public Pioneer profile — no auth required.
   * Returns grade, WAR score, fee range, domain, interaction count.
   * 404 for suspended, deleted, or unverified accounts.
   */
  public static async getPublicProfile(req: Request, res: Response): Promise<void> {
    try {
      const { username } = req.params;
      if (!username) {
        res.status(400).json({ error: 'username is required' });
        return;
      }

      const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

      const { data: profile, error } = await supabase
        .from('explorer_profiles')
        .select(`
          id, username, display_name, pioneer_grade, pioneer_points,
          verified_interaction_count, avg_founder_rating, bio,
          linkedin_verified, linkedin_domain_tenure_years,
          fee_min_paise, fee_max_paise,
          is_founding_explorer,
          domains (name, slug)
        `)
        .eq('username', cleanUsername)
        .maybeSingle();

      if (error || !profile) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      // Suspended, deleted, or unverified accounts are hidden (prevents enumeration)
      if (
        profile.pioneer_grade === 'SUSPENDED' ||
        profile.pioneer_grade === 'DELETED' ||
        !profile.linkedin_verified
      ) {
        res.status(404).json({ error: 'Profile not found' });
        return;
      }

      res.status(200).json({
        id: profile.id,
        username: profile.username,
        display_name: profile.display_name,
        pioneer_grade: profile.pioneer_grade,
        pioneer_points: profile.pioneer_points || 0,
        interaction_count: profile.verified_interaction_count || 0,
        avg_rating: profile.avg_founder_rating ?? null,
        bio: profile.bio || null,
        linkedin_domain_tenure_years: profile.linkedin_domain_tenure_years || 0,
        fee_min_paise: profile.fee_min_paise || 0,
        fee_max_paise: profile.fee_max_paise || 0,
        is_founding_explorer: profile.is_founding_explorer || false,
        domain: profile.domains
          ? { name: (profile.domains as any).name, slug: (profile.domains as any).slug }
          : null,
      });
    } catch (err: any) {
      console.error('[ExplorerController] getPublicProfile error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/public/explorer-profiles
   * Paginated list of all active, verified Pioneer profiles for sitemap generation.
   * Query: ?limit=<n>&offset=<n>
   */
  public static async listPublicProfiles(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(Number(req.query.limit) || 200, 500);
      const offset = Number(req.query.offset) || 0;

      const { data: profiles, error } = await supabase
        .from('explorer_profiles')
        .select('username, updated_at')
        .eq('linkedin_verified', true)
        .not('pioneer_grade', 'in', '("SUSPENDED","DELETED")')
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: 'Failed to fetch profiles' });
        return;
      }

      res.status(200).json(profiles || []);
    } catch (err: any) {
      console.error('[ExplorerController] listPublicProfiles error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/explorer/preview-feed
   * Public preview feed of 3 anonymized Sparks.
   * Query: ?domain=<slug>
   */
  public static async getPreviewFeed(req: Request, res: Response): Promise<void> {
    try {
      const domainSlug = (req.query.domain as string) || 'b2b-saas';
      const sparks = await ExplorerService.getPreviewFeed(domainSlug.trim().toLowerCase());
      res.status(200).json({ sparks });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  // ── Admin Grade Review Endpoints (P5.5) ─────────────────────────────

  /**
   * GET /api/admin/grade-reviews
   * Returns all Explorer profiles that qualify for the next Pioneer grade.
   * Uses PioneerGradeService.evaluateAdvancement to compute eligibility.
   * Paginated: ?limit=50&offset=0
   */
  public static async listGradeReviewCandidates(req: Request, res: Response): Promise<void> {
    try {
      const limit = Math.min(parseInt((req.query.limit as string) || '50', 10), 200);
      const offset = parseInt((req.query.offset as string) || '0', 10);

      // Fetch profiles that could plausibly qualify — pre-filter in DB to avoid scanning all rows
      const { data: profiles, error } = await supabase
        .from('explorer_profiles')
        .select('id, username, display_name, pioneer_grade, pioneer_points, verified_interaction_count, avg_founder_rating, linkedin_verified, linkedin_verified_at, linkedin_tenure_months, senior_fast_track_completed, master_founder_interactions_count, domain_id, domains(name)')
        .or(
          'and(pioneer_grade.eq.SCOUT,verified_interaction_count.gte.3,avg_founder_rating.gte.3.5),' +
          'and(pioneer_grade.eq.SEED,verified_interaction_count.gte.3,avg_founder_rating.gte.3.8),' +
          'and(pioneer_grade.eq.RISING,verified_interaction_count.gte.10,avg_founder_rating.gte.4.0),' +
          'and(pioneer_grade.eq.PRO,verified_interaction_count.gte.25,avg_founder_rating.gte.4.3),' +
          'and(pioneer_grade.eq.MASTER,verified_interaction_count.gte.50,avg_founder_rating.gte.4.5)'
        )
        .order('avg_founder_rating', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        res.status(500).json({ error: 'Failed to fetch grade review candidates' });
        return;
      }

      const candidates: any[] = [];
      const now = new Date();

      for (const p of (profiles || [])) {
        const result = PioneerGradeService.evaluateAdvancement({
          currentGrade: p.pioneer_grade,
          war: Math.floor((parseFloat(p.avg_founder_rating) || 0) * 100) / 100,
          n: p.verified_interaction_count || 0,
          linkedinVerified: p.linkedin_verified || false,
          linkedinVerifiedAt: p.linkedin_verified_at || null,
          linkedinTenureMonths: p.linkedin_tenure_months || 0,
          seniorFastTrackCompleted: p.senior_fast_track_completed || false,
          masterFounderInteractionsCount: p.master_founder_interactions_count || 0,
          nowDate: now,
        });

        if (result.qualifies) {
          candidates.push({
            id: p.id,
            username: p.username,
            display_name: p.display_name || p.username,
            current_grade: result.currentGrade,
            next_grade: result.targetGrade,
            verified_interaction_count: p.verified_interaction_count || 0,
            avg_founder_rating: parseFloat(p.avg_founder_rating) || 0,
            pioneer_points: p.pioneer_points || 0,
            domain_name: (p.domains as any)?.name || 'Unknown',
            qualifies: result.qualifies,
            requires_admin: result.requiresAdmin,
            war: result.war,
            spike_flagged: result.spikeFlagged,
          });
        }
      }

      res.status(200).json(candidates);
    } catch (err: any) {
      console.error('[ExplorerController] listGradeReviewCandidates error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/admin/grade-approve/:id
   * Admin approves a grade advancement for the given Explorer.
   * Re-verifies eligibility server-side before updating.
   */
  public static async approveGradeAdvancement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Explorer ID is required' });
        return;
      }

      const { data: profile, error: fetchErr } = await supabase
        .from('explorer_profiles')
        .select('id, username, pioneer_grade, verified_interaction_count, avg_founder_rating, linkedin_verified, linkedin_verified_at, linkedin_tenure_months, senior_fast_track_completed, master_founder_interactions_count')
        .eq('id', id)
        .maybeSingle();

      if (fetchErr || !profile) {
        res.status(404).json({ error: 'Explorer profile not found' });
        return;
      }

      const result = PioneerGradeService.evaluateAdvancement({
        currentGrade: profile.pioneer_grade,
        war: Math.floor((parseFloat(profile.avg_founder_rating) || 0) * 100) / 100,
        n: profile.verified_interaction_count || 0,
        linkedinVerified: profile.linkedin_verified || false,
        linkedinVerifiedAt: profile.linkedin_verified_at || null,
        linkedinTenureMonths: profile.linkedin_tenure_months || 0,
        seniorFastTrackCompleted: profile.senior_fast_track_completed || false,
        masterFounderInteractionsCount: profile.master_founder_interactions_count || 0,
        nowDate: new Date(),
      });

      if (!result.qualifies) {
        res.status(422).json({
          error: 'Explorer does not currently qualify for grade advancement',
          reasons: result.reasons,
          currentGrade: result.currentGrade,
          war: result.war,
          n: result.n,
        });
        return;
      }

      const newPoints = Math.floor(result.war * 100) + (result.n * 10);

      const { error: updateErr } = await supabase
        .from('explorer_profiles')
        .update({
          pioneer_grade: result.targetGrade,
          pioneer_points: newPoints,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (updateErr) {
        res.status(500).json({ error: 'Failed to update Pioneer grade' });
        return;
      }

      console.log(`[GradeReview] Admin approved ${profile.username}: ${result.currentGrade} → ${result.targetGrade}`);
      res.status(200).json({
        success: true,
        explorerId: id,
        username: profile.username,
        previousGrade: result.currentGrade,
        newGrade: result.targetGrade,
        newPoints,
      });
    } catch (err: any) {
      console.error('[ExplorerController] approveGradeAdvancement error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }

  /**
   * POST /api/admin/grade-reject/:id
   * Admin rejects a grade advancement. Logs the reason but does not modify the profile.
   * Body: { reason?: string }
   */
  public static async rejectGradeAdvancement(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body || {};
      if (!id) {
        res.status(400).json({ error: 'Explorer ID is required' });
        return;
      }

      const { data: profile } = await supabase
        .from('explorer_profiles')
        .select('id, username, pioneer_grade')
        .eq('id', id)
        .maybeSingle();

      if (!profile) {
        res.status(404).json({ error: 'Explorer profile not found' });
        return;
      }

      console.log(`[GradeReview] Admin rejected ${profile.username} (grade: ${profile.pioneer_grade}). Reason: ${reason || 'None provided'}`);
      res.status(200).json({ success: true, explorerId: id, username: profile.username });
    } catch (err: any) {
      console.error('[ExplorerController] rejectGradeAdvancement error:', err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
}


