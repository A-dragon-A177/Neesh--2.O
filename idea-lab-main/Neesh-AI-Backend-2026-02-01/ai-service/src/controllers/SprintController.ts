/**
 * NEESH V19 SPRINT CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section Y.10.1, Step 3, Section AW Rule 3, Section W.6.3, Section Y.10.2)
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { SPRINT_DAY_PRICE_PAISE, ALLOWED_SPRINT_DAYS } from '../constants/pricing';
import { CashfreeService } from '../services/CashfreeService';
import { NotificationService } from '../services/NotificationService';
import { LedgerService } from '../services/LedgerService';

export class SprintController {
  /**
   * POST /api/sprints/purchase
   * Initiates a Sprint day purchase.
   * If available account balance covers 100% of the cost, activates immediately without Cashfree order.
   * If partial or zero balance, creates Cashfree order for the remaining charge.
   */
  public static async purchase(req: Request, res: Response): Promise<void> {
    try {
      const founderId = (req as any).user?.id || (req as any).user?.sub;
      if (!founderId) {
        res.status(401).json({ error: 'Unauthorized: Missing founder identity' });
        return;
      }

      const body = req.body || {};
      const spotlightId = body.spotlightId || body.spotlight_id;
      const daysInput = body.days !== undefined ? body.days : body.days_purchased || body.daysPurchased;
      const applyCredits = body.applyCredits !== undefined ? Boolean(body.applyCredits) : true;

      // 1. Validation
      if (!spotlightId) {
        res.status(400).json({ error: 'spotlightId is required' });
        return;
      }

      const days = parseInt(daysInput, 10);
      if (isNaN(days) || days < 1) {
        res.status(400).json({
          error: `Invalid days: ${daysInput}. Days must be an integer >= 1 (recommended: ${ALLOWED_SPRINT_DAYS.join(', ')})`,
        });
        return;
      }

      // 2. Verify Spotlight exists and belongs to authenticated founder
      const { data: spotlight, error: spotlightError } = await supabase
        .from('spotlights')
        .select('*')
        .eq('id', spotlightId)
        .maybeSingle();

      if (spotlightError) {
        res.status(500).json({ error: `Database error: ${spotlightError.message}` });
        return;
      }

      if (!spotlight) {
        res.status(404).json({ error: 'Spotlight not found' });
        return;
      }

      if (spotlight.founder_id !== founderId) {
        res.status(403).json({ error: 'Forbidden: Spotlight does not belong to this founder' });
        return;
      }

      // 3. Check Spotlight state and existing active/pending sprint sessions
      const { data: existingSessions, error: sessionCheckError } = await supabase
        .from('sprint_sessions')
        .select('*')
        .eq('spotlight_id', spotlightId)
        .in('state', ['ACTIVE', 'PAYMENT_PENDING']);

      if (sessionCheckError) {
        res.status(500).json({ error: `Database error: ${sessionCheckError.message}` });
        return;
      }

      const activeSession = existingSessions?.find((s) => s.state === 'ACTIVE');
      if (activeSession) {
        res.status(409).json({
          error: 'An active Sprint already exists for this spotlight',
          activeSprintSessionId: activeSession.id,
        });
        return;
      }

      // If existing PAYMENT_PENDING session exists, return it (idempotent recovery)
      const pendingSession = existingSessions?.find((s) => s.state === 'PAYMENT_PENDING');
      if (pendingSession) {
        res.status(200).json({
          sprintSessionId: pendingSession.id,
          cashfreeOrderId: pendingSession.cashfree_order_id,
          paymentSessionId: `session_${pendingSession.cashfree_order_id}`,
          totalAmountPaise: pendingSession.amount_paise,
          creditsAppliedPaise: '0',
          chargeAmountPaise: pendingSession.amount_paise,
          guaranteeEligible: pendingSession.guarantee_eligible,
          message: 'Existing pending payment session returned',
        });
        return;
      }

      // 4. Calculate total amount in integer paise
      const totalAmountPaise = SPRINT_DAY_PRICE_PAISE * BigInt(days);
      let creditsAppliedPaise = 0n;
      let chargeAmountPaise = totalAmountPaise;

      if (applyCredits) {
        try {
          const accountBalancePaise = await LedgerService.calculateAccountBalance(founderId);
          if (accountBalancePaise > 0n) {
            if (accountBalancePaise >= totalAmountPaise) {
              creditsAppliedPaise = totalAmountPaise;
              chargeAmountPaise = 0n;
            } else {
              creditsAppliedPaise = accountBalancePaise;
              chargeAmountPaise = totalAmountPaise - accountBalancePaise;
            }
          }
        } catch (balErr) {
          console.warn('[SprintController] Balance check skipped:', balErr);
        }
      }

      const guaranteeEligible = days >= 7;

      // 5. If 100% covered by account balance, confirm immediately without Cashfree PG order
      if (chargeAmountPaise === 0n) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        // PRD Section J.2: 13-day claim window after expiration
        const claimClosesAt = new Date(expiresAt.getTime() + 13 * 24 * 60 * 60 * 1000);
        const balanceOrderId = `BALANCE_SPRINT_${Date.now()}_${uuidv4().substring(0, 8)}`;

        const { data: newSession, error: insertSessionError } = await supabase
          .from('sprint_sessions')
          .insert({
            spotlight_id: spotlightId,
            founder_id: founderId,
            days_purchased: days,
            amount_paise: totalAmountPaise.toString(),
            cashfree_order_id: balanceOrderId,
            state: 'ACTIVE',
            guarantee_eligible: guaranteeEligible,
            pioneer_count: 0,
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            claim_window_opens_at: expiresAt.toISOString(),
            claim_window_closes_at: claimClosesAt.toISOString(),
          })
          .select()
          .single();

        if (insertSessionError || !newSession) {
          res.status(500).json({ error: `Failed to create sprint session: ${insertSessionError?.message}` });
          return;
        }

        // Update spotlight state to SPRINT_ACTIVE
        await supabase
          .from('spotlights')
          .update({ state: 'SPRINT_ACTIVE' })
          .eq('id', spotlightId);

        // Debit total amount from founder balance
        await LedgerService.createEntry({
          entryType: 'SPRINT_DAY_PURCHASE',
          direction: 'DEBIT',
          amountPaise: totalAmountPaise,
          userId: founderId,
          referenceType: 'SPRINT',
          referenceId: newSession.id,
          idempotencyKey: `SPRINT_BAL_PURCHASE_${newSession.id}`,
          status: 'COMPLETED',
          metadata: {
            spotlight_id: spotlightId,
            days_purchased: days,
            paid_with_balance: true,
          },
        });

        // Non-blocking SPRINT_ACTIVATED notification
        try {
          NotificationService.send({
            type: 'SPRINT_ACTIVATED',
            data: {
              sprintId: newSession.id,
              endDate: expiresAt.toISOString(),
            },
          }).catch(() => {});
        } catch (e) {}

        res.status(200).json({
          sprintSessionId: newSession.id,
          state: 'ACTIVE',
          paidWithBalance: true,
          totalAmountPaise: totalAmountPaise.toString(),
          creditsAppliedPaise: totalAmountPaise.toString(),
          chargeAmountPaise: '0',
          guaranteeEligible,
          message: 'Sprint activated immediately using account balance',
        });
        return;
      }

      // 6. Otherwise, create Cashfree Order for chargeAmountPaise
      const orderId = `CF_SPRINT_${Date.now()}_${uuidv4().substring(0, 8)}`;
      const cfOrder = await CashfreeService.createOrder({
        orderId,
        orderAmountPaise: chargeAmountPaise,
        customerDetails: {
          customerId: founderId,
          customerEmail: (req as any).user?.email,
        },
        orderNote: `Sprint ${days} days for Spotlight ${spotlightId}`,
      });

      // 7. Insert sprint_sessions record in PAYMENT_PENDING state
      const { data: newSession, error: insertSessionError } = await supabase
        .from('sprint_sessions')
        .insert({
          spotlight_id: spotlightId,
          founder_id: founderId,
          days_purchased: days,
          amount_paise: totalAmountPaise.toString(),
          cashfree_order_id: cfOrder.orderId,
          state: 'PAYMENT_PENDING',
          guarantee_eligible: guaranteeEligible,
          pioneer_count: 0,
        })
        .select()
        .single();

      if (insertSessionError || !newSession) {
        console.error('[SprintController] Failed to create sprint_session:', insertSessionError);
        res.status(500).json({ error: `Failed to create sprint session: ${insertSessionError?.message}` });
        return;
      }

      // 8. Insert pending ledger_entry
      const idempotencyKey = `SPRINT_DAY_PURCHASE:${newSession.id}:${uuidv4()}`;
      try {
        await LedgerService.createEntry({
          entryType: 'SPRINT_DAY_PURCHASE',
          direction: 'DEBIT',
          amountPaise: totalAmountPaise,
          userId: founderId,
          referenceType: 'SPRINT',
          referenceId: newSession.id,
          status: 'PENDING',
          idempotencyKey,
          metadata: {
            spotlight_id: spotlightId,
            days_purchased: days,
            cashfree_order_id: cfOrder.orderId,
            credits_applied_paise: creditsAppliedPaise.toString(),
            charge_amount_paise: chargeAmountPaise.toString(),
          },
        });
      } catch (ledgerErr: any) {
        console.error('[SprintController] Ledger entry creation warning:', ledgerErr);
      }

      res.status(200).json({
        sprintSessionId: newSession.id,
        cashfreeOrderId: cfOrder.orderId,
        paymentSessionId: cfOrder.paymentSessionId,
        totalAmountPaise: totalAmountPaise.toString(),
        creditsAppliedPaise: creditsAppliedPaise.toString(),
        chargeAmountPaise: chargeAmountPaise.toString(),
        guaranteeEligible,
      });
    } catch (err: any) {
      console.error('[SprintController] Purchase exception:', err);
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  }

  /**
   * POST /api/sprints/:id/guarantee-claim
   * Executes a guarantee claim if eligible, within window, and unfulfilled.
   * Reference: Section W.6.3 & Section Y.10.2
   */
  public static async claimGuarantee(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const founderId = (req as any).user?.id || (req as any).user?.sub;

      if (!founderId) {
        res.status(401).json({ error: 'Unauthorized: Missing founder identity' });
        return;
      }

      // 1. Fetch Sprint session
      const { data: session, error } = await supabase
        .from('sprint_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !session) {
        res.status(404).json({ error: 'Sprint session not found' });
        return;
      }

      if (session.founder_id !== founderId && (req as any).user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden: You do not own this Sprint session' });
        return;
      }

      // 2. Eligibility & State checks
      if (!session.guarantee_eligible) {
        res.status(400).json({
          error: 'This Sprint session is not eligible for the 3+ Pioneer guarantee (duration < 7 days)',
        });
        return;
      }

      if (session.state === 'GUARANTEE_CLAIMED') {
        res.status(409).json({ error: 'Guarantee claim already submitted for this sprint session' });
        return;
      }

      if (session.state !== 'GUARANTEE_CLAIMABLE') {
        res.status(400).json({
          error: `Sprint session is not in claimable state (current state: ${session.state})`,
        });
        return;
      }

      // 3. Window check
      const now = new Date();
      if (session.claim_window_opens_at && new Date(session.claim_window_opens_at) > now) {
        res.status(400).json({
          error: `Guarantee claim window has not opened yet (opens at: ${session.claim_window_opens_at})`,
        });
        return;
      }

      if (session.claim_window_closes_at && new Date(session.claim_window_closes_at) < now) {
        res.status(400).json({
          error: `Guarantee claim window has closed (closed at: ${session.claim_window_closes_at})`,
        });
        return;
      }

      // 4. Duplicate claim check in guarantee_claims
      const { data: existingClaim } = await supabase
        .from('guarantee_claims')
        .select('id')
        .eq('sprint_session_id', id)
        .maybeSingle();

      if (existingClaim) {
        res.status(409).json({ error: 'Guarantee claim already submitted for this sprint session' });
        return;
      }

      const creditAmountPaise = BigInt(session.amount_paise);

      // 5. Atomic claim execution
      // A. Insert guarantee_claims record
      const { data: claim, error: claimError } = await supabase
        .from('guarantee_claims')
        .insert({
          sprint_session_id: session.id,
          founder_id: founderId,
          pioneer_grade_count_at_claim: session.pioneer_count || 0,
          credit_amount_paise: creditAmountPaise.toString(),
        })
        .select()
        .single();

      if (claimError || !claim) {
        res.status(500).json({ error: `Failed to record guarantee claim: ${claimError?.message}` });
        return;
      }

      // B. Append GUARANTEE_CREDIT to ledger
      await LedgerService.createEntry({
        entryType: 'GUARANTEE_CREDIT',
        direction: 'CREDIT',
        amountPaise: creditAmountPaise,
        userId: founderId,
        referenceType: 'GUARANTEE_CLAIM',
        referenceId: claim.id,
        idempotencyKey: `GC_${session.id}`,
        status: 'COMPLETED',
        metadata: {
          sprint_session_id: session.id,
          pioneer_count: session.pioneer_count,
        },
      });

      // C. Update sprint_sessions state
      await supabase
        .from('sprint_sessions')
        .update({ state: 'GUARANTEE_CLAIMED' })
        .eq('id', session.id);

      res.status(200).json({
        success: true,
        claimId: claim.id,
        sprintSessionId: session.id,
        creditAmountPaise: creditAmountPaise.toString(),
        message: 'Guarantee claim approved. 100% of Sprint fee credited to your account balance.',
      });
    } catch (err: any) {
      console.error('[SprintController] Guarantee claim exception:', err);
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  }

  /**
   * GET /api/sprints/:id
   * Retrieves Sprint session status and guarantee tracker.
   */
  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id || (req as any).user?.sub;

      const { data: session, error } = await supabase
        .from('sprint_sessions')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !session) {
        res.status(404).json({ error: 'Sprint session not found' });
        return;
      }

      if (session.founder_id !== userId && (req as any).user?.role !== 'ADMIN') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }

      res.status(200).json(session);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'Internal Server Error' });
    }
  }
}
