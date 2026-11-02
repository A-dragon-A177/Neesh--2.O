/**
 * NEESH V19 DASHBOARD & WALLET CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Phase 5, Task 5, 6, 7)
 * 
 * Endpoints:
 * - GET /api/dashboard/founder: Sparks, active Sprints, balance, guarantee claim status
 * - GET /api/dashboard/explorer: Pioneer grade, points, active interactions, requests, earnings
 * - GET /api/wallet: Ledger balance and reverse-chronological transaction entries with human-readable descriptions
 */

import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { LedgerService } from '../services/LedgerService';

export class DashboardController {
  /**
   * Helper: formats entry reasons into user-friendly strings.
   */
  public static formatHumanReadableReason(entry: any): string {
    const type = entry.entry_type || entry.reason || '';
    const domain = entry.metadata?.domain || entry.metadata?.spotlight_domain || 'Platform';

    switch (type) {
      case 'SPRINT_DAY_PURCHASE':
      case 'SPRINT_PURCHASE':
        return `Sprint — ${domain}`;
      case 'INTERACTION_FEE_CREDIT':
        return `Interaction fee — ${domain}`;
      case 'GUARANTEE_CREDIT':
      case 'GUARANTEE_REFUND':
        return `Sprint guarantee credit`;
      case 'EARNINGS_BASELINE_CREDIT':
        return `Founding Explorer baseline credit`;
      case 'ESCROW_HOLD':
        return `Escrow hold — ${domain} Direct Request`;
      case 'ESCROW_RETURN':
        return `Escrow refund — ${domain} Direct Request`;
      case 'ESCROW_RELEASE':
        return `Escrow released — ${domain} Direct Request`;
      case 'COMMISSION_CREDIT':
        return `Platform service commission`;
      case 'COMMISSION_WAIVED':
        return `Founding Explorer 0% commission waiver`;
      default:
        return entry.metadata?.description || type.replace(/_/g, ' ').toLowerCase();
    }
  }

  /**
   * GET /api/dashboard/founder
   */
  public static async getFounderDashboard(req: Request, res: Response): Promise<void> {
    try {
      const founderId = (req as any).user?.id || req.query.founderId || '00000000-0000-0000-0000-000000000002';

      // 1. Fetch Sparks
      const { data: rawSparks } = await supabase
        .from('sparks')
        .select('id, startup_name, one_sentence_pitch, state, interaction_count, domain_id, domains (name, slug)')
        .eq('founder_id', founderId)
        .order('created_at', { ascending: false });

      const sparks = (rawSparks || []).map((s) => ({
        id: s.id,
        title: s.startup_name,
        pitch: s.one_sentence_pitch,
        state: s.state,
        interactionCount: s.interaction_count || 0,
        domain: (s.domains as any)?.name || 'General',
        domainSlug: (s.domains as any)?.slug || 'general',
      }));

      // 2. Fetch Active Sprints
      const { data: rawSprints } = await supabase
        .from('sprint_sessions')
        .select('*')
        .eq('founder_id', founderId)
        .order('created_at', { ascending: false });

      const now = Date.now();
      const activeSprints = (rawSprints || []).map((sp) => {
        const endsAt = sp.ends_at ? new Date(sp.ends_at).getTime() : now + 7 * 24 * 60 * 60 * 1000;
        const daysRemaining = Math.max(0, Math.ceil((endsAt - now) / (24 * 60 * 60 * 1000)));

        return {
          id: sp.id,
          state: sp.state,
          daysPurchased: sp.days_purchased,
          daysRemaining,
          pioneerInteractionCount: sp.pioneer_count || 0,
          guaranteeEligible: sp.guarantee_eligible ?? (sp.days_purchased >= 7),
          claimWindowClosesAt: sp.claim_window_closes_at,
          ineligibilityReason: sp.ineligibility_reason,
        };
      });

      // 3. Compute Account Balance from Ledger
      let accountBalancePaise = 0n;
      try {
        accountBalancePaise = await LedgerService.getAccountBalance(founderId);
      } catch (e) {
        accountBalancePaise = 0n;
      }

      res.status(200).json({
        sparks,
        activeSprints,
        accountBalance: Number(accountBalancePaise) / 100,
        accountBalancePaise: accountBalancePaise.toString(),
        pendingSprintCost: 0,
      });
    } catch (err: any) {
      console.error('[DashboardController] getFounderDashboard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/dashboard/explorer
   */
  public static async getExplorerDashboard(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.query.userId || '00000000-0000-0000-0000-000000000003';

      // 1. Fetch Explorer Profile
      const { data: profile } = await supabase
        .from('explorer_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      const explorerId = profile?.id || 'exp-default';
      const pioneerGrade = profile?.pioneer_grade || 'RISING';
      const points = profile?.pioneer_points || 145;

      // Grade Progress calculation
      let gradeProgressPercent = 50;
      if (pioneerGrade === 'SEED') {
        gradeProgressPercent = Math.min(100, Math.round((points / 30) * 100));
      } else if (pioneerGrade === 'RISING') {
        gradeProgressPercent = Math.min(100, Math.round(((points - 30) / 70) * 100));
      } else if (pioneerGrade === 'PRO') {
        gradeProgressPercent = Math.min(100, Math.round(((points - 100) / 150) * 100));
      } else if (pioneerGrade === 'MASTER') {
        gradeProgressPercent = Math.min(100, Math.round(((points - 250) / 250) * 100));
      } else {
        gradeProgressPercent = 100;
      }

      // 2. Fetch Active Interactions
      const { data: rawInteractions } = await supabase
        .from('interactions')
        .select('id, state, content, founder_rating, created_at, spotlights (domain)')
        .eq('explorer_id', explorerId)
        .order('created_at', { ascending: false })
        .limit(10);

      const activeInteractions = (rawInteractions || []).map((i) => ({
        id: i.id,
        state: i.state,
        sparkDomain: (i.spotlights as any)?.domain || 'B2B SaaS',
        founderRating: i.founder_rating,
        fee_paise: '50000',
      }));

      // 3. Fetch Pending Direct Requests
      const { data: rawRequests } = await supabase
        .from('direct_requests')
        .select('id, fee_paise, expires_at, state')
        .eq('explorer_id', explorerId)
        .eq('state', 'PENDING');

      const pendingDirectRequests = (rawRequests || []).map((r) => ({
        id: r.id,
        fee_paise: r.fee_paise,
        expiresAt: r.expires_at,
      }));

      // 4. Founding Explorer Status
      const { data: founding } = await supabase
        .from('founding_explorer_registrations')
        .select('id, enrollment_order, commission_free_until')
        .eq('explorer_id', explorerId)
        .maybeSingle();

      const isFoundingExplorer = Boolean(founding);
      const commissionFreeUntil = founding?.commission_free_until || null;

      // 5. Total Earnings from Ledger
      let totalEarningsPaise = 0n;
      try {
        const { data: credits } = await supabase
          .from('ledger_entries')
          .select('amount_paise')
          .eq('user_id', userId)
          .eq('entry_type', 'INTERACTION_FEE_CREDIT')
          .eq('status', 'COMPLETED');

        if (credits) {
          for (const c of credits) {
            totalEarningsPaise += BigInt(c.amount_paise);
          }
        }
      } catch (e) {}

      res.status(200).json({
        pioneerGrade,
        pioneerPoints: points,
        gradeProgressPercent,
        activeInteractions,
        pendingDirectRequests,
        totalEarningsPaise: Number(totalEarningsPaise),
        totalEarningsRupees: Number(totalEarningsPaise) / 100,
        commissionFreeUntil,
        isFoundingExplorer,
      });
    } catch (err: any) {
      console.error('[DashboardController] getExplorerDashboard error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * GET /api/wallet
   * Returns current account balance and max 50 ledger entries in reverse chronological order.
   */
  public static async getWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id || req.query.userId || '00000000-0000-0000-0000-000000000002';

      // 1. Balance
      let balancePaise = 0n;
      try {
        balancePaise = await LedgerService.getAccountBalance(userId);
      } catch (e) {
        balancePaise = 0n;
      }

      // 2. Fetch max 50 recent ledger entries in reverse chronological order
      const { data: rawEntries, error } = await supabase
        .from('ledger_entries')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const entries = (rawEntries || []).map((e) => ({
        id: e.id,
        type: e.direction, // CREDIT | DEBIT
        reason: e.entry_type,
        humanReason: DashboardController.formatHumanReadableReason(e),
        amount_paise: Number(e.amount_paise),
        amount_rupees: Number(e.amount_paise) / 100,
        state: e.status, // COMPLETED | PENDING
        created_at: e.created_at,
      }));

      res.status(200).json({
        balancePaise: Number(balancePaise),
        balanceRupees: Number(balancePaise) / 100,
        entries,
      });
    } catch (err: any) {
      console.error('[DashboardController] getWallet error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

