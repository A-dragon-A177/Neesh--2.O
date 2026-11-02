/**
 * NEESH V19 DIRECT REQUEST SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section K.1, Section W.3, Section W.5, Section Y)
 * 
 * Non-negotiable rules:
 * 1. Explorer fees are locked at the moment of request creation into direct_requests.fee_paise.
 * 2. Message length is strictly <= 500 characters.
 * 3. Funds held in escrow via ESCROW_HOLD upon payment.
 * 4. Decline or 48-hour expiration returns escrow via ESCROW_RETURN to founder.
 * 5. Completion releases escrow: ESCROW_RELEASE + INTERACTION_FEE_CREDIT + COMMISSION_CREDIT/WAIVED.
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { PLATFORM_SYSTEM_ID } from '../constants/pricing';
import { CashfreeService } from './CashfreeService';
import { CommissionService } from './CommissionService';
import { LedgerService } from './LedgerService';
import { NotificationService } from './NotificationService';

export interface CreateDirectRequestInput {
  founderId: string;
  explorerId: string;
  spotlightId: string;
  message: string;
  applyBalance?: boolean;
}

export class DirectRequestService {
  /**
   * Creates a Direct Request with locked fee and sets up escrow payment.
   */
  public static async createDirectRequest(input: CreateDirectRequestInput) {
    const { founderId, explorerId, spotlightId, message, applyBalance = true } = input;

    if (!founderId || !explorerId || !spotlightId) {
      throw new Error('founderId, explorerId, and spotlightId are required');
    }

    const trimmedMsg = (message || '').trim();
    if (!trimmedMsg) {
      throw new Error('Message is required');
    }
    if (trimmedMsg.length > 500) {
      throw new Error(`Message exceeds maximum limit of 500 characters (length: ${trimmedMsg.length})`);
    }

    // 1. Fetch Explorer profile & lock fee
    const { data: explorer, error: explorerError } = await supabase
      .from('explorer_profiles')
      .select('id, user_id, fee_min_paise, fee_max_paise, pioneer_grade, state')
      .eq('id', explorerId)
      .maybeSingle();

    if (explorerError || !explorer) {
      throw new Error(`Explorer not found: ${explorerError?.message || explorerId}`);
    }

    if (explorer.state !== 'ACTIVE') {
      throw new Error('Explorer profile is not active for direct requests');
    }

    // Lock fee to fee_min_paise (or fallback to standard SEED 10000n)
    const feePaise = explorer.fee_min_paise ? BigInt(explorer.fee_min_paise) : 10000n;
    if (feePaise <= 0n) {
      throw new Error('Explorer fee must be strictly positive');
    }

    // 2. Check founder balance if applyBalance is enabled
    let paidFromBalance = false;
    let chargeAmountPaise = feePaise;

    if (applyBalance) {
      try {
        const balance = await LedgerService.calculateAccountBalance(founderId);
        if (balance >= feePaise) {
          paidFromBalance = true;
          chargeAmountPaise = 0n;
        }
      } catch (balErr) {
        console.warn('[DirectRequestService] Failed to check founder balance, falling back to PG:', balErr);
      }
    }

    const orderId = `CF_DR_${Date.now()}_${uuidv4().substring(0, 8)}`;
    let cfOrderId: string | null = null;
    let paymentSessionId: string | null = null;

    if (!paidFromBalance) {
      const cfOrder = await CashfreeService.createOrder({
        orderId,
        orderAmountPaise: chargeAmountPaise,
        customerDetails: { customerId: founderId },
        orderNote: `Direct Request to Explorer ${explorerId}`,
      });
      cfOrderId = cfOrder.orderId;
      paymentSessionId = cfOrder.paymentSessionId;
    }

    // 3. Insert direct_requests record
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    const initialState = paidFromBalance ? 'PENDING' : 'PAYMENT_PENDING';

    const { data: newRequest, error: insertError } = await supabase
      .from('direct_requests')
      .insert({
        founder_id: founderId,
        explorer_id: explorerId,
        spotlight_id: spotlightId,
        message: trimmedMsg,
        fee_paise: feePaise.toString(),
        cashfree_order_id: cfOrderId,
        state: initialState,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (insertError || !newRequest) {
      throw new Error(`Failed to create direct request: ${insertError?.message}`);
    }

    // 4. If paid completely from balance, hold escrow immediately
    if (paidFromBalance) {
      await LedgerService.createEntry({
        entryType: 'ESCROW_HOLD',
        direction: 'DEBIT',
        amountPaise: feePaise,
        userId: founderId,
        referenceType: 'DIRECT_REQUEST',
        referenceId: newRequest.id,
        idempotencyKey: `ESCROW_HOLD_BAL_${newRequest.id}`,
        status: 'COMPLETED',
        metadata: {
          spotlight_id: spotlightId,
          explorer_id: explorerId,
          fee_paise: feePaise.toString(),
        },
      });
    }

    // Non-blocking DIRECT_REQUEST_RECEIVED notification
    try {
      NotificationService.send({
        type: 'DIRECT_REQUEST_RECEIVED',
        data: {
          description: trimmedMsg,
          feeRupees: Number(feePaise) / 100,
        },
      }).catch(() => {});
    } catch (e) {}

    return {
      directRequest: newRequest,
      paidFromBalance,
      cashfreeOrderId: cfOrderId,
      paymentSessionId,
      feePaise: feePaise.toString(),
    };
  }

  /**
   * Confirms payment for a direct request and locks escrow.
   * Called by webhook upon Cashfree payment SUCCESS.
   */
  public static async confirmPayment(cashfreeOrderId: string) {
    const { data: request, error } = await supabase
      .from('direct_requests')
      .select('*')
      .eq('cashfree_order_id', cashfreeOrderId)
      .maybeSingle();

    if (error || !request) {
      throw new Error(`Direct request not found for order ${cashfreeOrderId}`);
    }

    if (request.state !== 'PAYMENT_PENDING') {
      return request; // Idempotent
    }

    const feePaise = BigInt(request.fee_paise);

    // Record ESCROW_HOLD
    await LedgerService.createEntry({
      entryType: 'ESCROW_HOLD',
      direction: 'DEBIT',
      amountPaise: feePaise,
      userId: request.founder_id,
      referenceType: 'DIRECT_REQUEST',
      referenceId: request.id,
      idempotencyKey: `ESCROW_HOLD_CF_${request.id}`,
      status: 'COMPLETED',
      metadata: { cashfree_order_id: cashfreeOrderId },
    });

    const { data: updated, error: updateError } = await supabase
      .from('direct_requests')
      .update({ state: 'PENDING' })
      .eq('id', request.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update direct request state: ${updateError.message}`);
    }

    return updated;
  }

  /**
   * Explorer accepts a Direct Request -> transitions to ACCEPTED and creates linked interaction.
   */
  public static async acceptDirectRequest(directRequestId: string, explorerProfileId: string) {
    const { data: request, error } = await supabase
      .from('direct_requests')
      .select('*')
      .eq('id', directRequestId)
      .maybeSingle();

    if (error || !request) {
      throw new Error(`Direct request not found: ${directRequestId}`);
    }

    if (request.explorer_id !== explorerProfileId) {
      throw new Error('Unauthorized: Explorer ID does not match direct request');
    }

    if (request.state !== 'PENDING') {
      throw new Error(`Cannot accept direct request in state '${request.state}' (must be PENDING)`);
    }

    // 1. Create linked interaction
    const { data: interaction, error: interactionError } = await supabase
      .from('interactions')
      .insert({
        spotlight_id: request.spotlight_id,
        founder_id: request.founder_id,
        explorer_id: request.explorer_id,
        interaction_type: 'DIRECT_REQUEST',
        content: request.message,
        state: 'PENDING',
      })
      .select()
      .single();

    if (interactionError || !interaction) {
      throw new Error(`Failed to create linked interaction: ${interactionError?.message}`);
    }

    // 2. Append event to interaction_events
    await supabase.from('interaction_events').insert({
      interaction_id: interaction.id,
      event_type: 'DIRECT_REQUEST_ACCEPTED',
    });

    // 3. Update direct_requests record
    const { data: updated, error: updateError } = await supabase
      .from('direct_requests')
      .update({
        state: 'ACCEPTED',
        accepted_at: new Date().toISOString(),
        interaction_id: interaction.id,
      })
      .eq('id', directRequestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update direct request state: ${updateError.message}`);
    }

    // Non-blocking DIRECT_REQUEST_ACCEPTED notification
    try {
      NotificationService.send({
        type: 'DIRECT_REQUEST_ACCEPTED',
        data: {
          explorerName: explorerProfileId,
          feeRupees: Number(request.fee_paise) / 100,
        },
      }).catch(() => {});
    } catch (e) {}

    return { directRequest: updated, interaction };
  }

  /**
   * Explorer declines a Direct Request -> refunds escrow back to Founder via ESCROW_RETURN.
   */
  public static async declineDirectRequest(directRequestId: string, explorerProfileId: string) {
    const { data: request, error } = await supabase
      .from('direct_requests')
      .select('*')
      .eq('id', directRequestId)
      .maybeSingle();

    if (error || !request) {
      throw new Error(`Direct request not found: ${directRequestId}`);
    }

    if (request.explorer_id !== explorerProfileId) {
      throw new Error('Unauthorized: Explorer ID does not match direct request');
    }

    if (request.state !== 'PENDING') {
      throw new Error(`Cannot decline direct request in state '${request.state}' (must be PENDING)`);
    }

    const feePaise = BigInt(request.fee_paise);

    // 1. Credit escrow back to founder
    await LedgerService.createEntry({
      entryType: 'ESCROW_RETURN',
      direction: 'CREDIT',
      amountPaise: feePaise,
      userId: request.founder_id,
      referenceType: 'DIRECT_REQUEST',
      referenceId: request.id,
      idempotencyKey: `ESCROW_RETURN_DECLINE_${request.id}`,
      status: 'COMPLETED',
      metadata: { reason: 'DECLINED_BY_EXPLORER' },
    });

    // 2. Update direct_requests record
    const { data: updated, error: updateError } = await supabase
      .from('direct_requests')
      .update({
        state: 'DECLINED',
        declined_at: new Date().toISOString(),
      })
      .eq('id', directRequestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update direct request state: ${updateError.message}`);
    }

    return updated;
  }

  /**
   * Automatically expires a Direct Request if 48 hours elapsed -> ESCROW_RETURN.
   */
  public static async expireDirectRequest(directRequestId: string) {
    const { data: request, error } = await supabase
      .from('direct_requests')
      .select('*')
      .eq('id', directRequestId)
      .maybeSingle();

    if (error || !request) {
      throw new Error(`Direct request not found: ${directRequestId}`);
    }

    if (request.state !== 'PENDING') {
      return request;
    }

    const feePaise = BigInt(request.fee_paise);

    // Escrow returned to founder
    await LedgerService.createEntry({
      entryType: 'ESCROW_RETURN',
      direction: 'CREDIT',
      amountPaise: feePaise,
      userId: request.founder_id,
      referenceType: 'DIRECT_REQUEST',
      referenceId: request.id,
      idempotencyKey: `ESCROW_RETURN_EXPIRE_${request.id}`,
      status: 'COMPLETED',
      metadata: { reason: 'EXPIRED_48_HOURS' },
    });

    const { data: updated, error: updateError } = await supabase
      .from('direct_requests')
      .update({
        state: 'EXPIRED',
      })
      .eq('id', directRequestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update direct request state: ${updateError.message}`);
    }

    return updated;
  }

  /**
   * Completes a paid interaction and distributes funds from escrow.
   * Triggered when the linked interaction is rated or completed.
   */
  public static async completePaidInteraction(directRequestId: string) {
    const { data: request, error } = await supabase
      .from('direct_requests')
      .select('*')
      .eq('id', directRequestId)
      .maybeSingle();

    if (error || !request) {
      throw new Error(`Direct request not found: ${directRequestId}`);
    }

    if (request.state === 'COMPLETED') {
      return request; // Idempotent
    }

    const feePaise = BigInt(request.fee_paise);

    // 1. Calculate commission
    const commission = await CommissionService.getCommissionForExplorer(
      feePaise,
      request.explorer_id
    );

    // 2. Fetch explorer user_id for credit
    const { data: explorerProfile } = await supabase
      .from('explorer_profiles')
      .select('user_id')
      .eq('id', request.explorer_id)
      .maybeSingle();

    const explorerUserId = explorerProfile?.user_id || request.explorer_id;

    // 3. Release escrow hold
    await LedgerService.createEntry({
      entryType: 'ESCROW_RELEASE',
      direction: 'CREDIT',
      amountPaise: feePaise,
      userId: PLATFORM_SYSTEM_ID,
      referenceType: 'DIRECT_REQUEST',
      referenceId: request.id,
      idempotencyKey: `ESCROW_RELEASE_${request.id}`,
      status: 'COMPLETED',
      metadata: { direct_request_id: request.id },
    });

    // 4. Credit Explorer payout
    if (commission.explorerPayoutPaise > 0n) {
      await LedgerService.createEntry({
        entryType: 'INTERACTION_FEE_CREDIT',
        direction: 'CREDIT',
        amountPaise: commission.explorerPayoutPaise,
        userId: explorerUserId,
        referenceType: 'DIRECT_REQUEST',
        referenceId: request.id,
        idempotencyKey: `FEE_CREDIT_EXP_${request.id}`,
        status: 'COMPLETED',
        metadata: {
          gross_fee_paise: feePaise.toString(),
          payout_paise: commission.explorerPayoutPaise.toString(),
        },
      });
    }

    // 5. Credit Platform commission if non-zero, or record waiver
    if (commission.commissionPaise > 0n) {
      await LedgerService.createEntry({
        entryType: 'COMMISSION_CREDIT',
        direction: 'CREDIT',
        amountPaise: commission.commissionPaise,
        userId: PLATFORM_SYSTEM_ID,
        referenceType: 'DIRECT_REQUEST',
        referenceId: request.id,
        idempotencyKey: `COMMISSION_CREDIT_${request.id}`,
        status: 'COMPLETED',
        metadata: {
          rate_percent: commission.ratePercent.toString(),
          gross_fee_paise: feePaise.toString(),
        },
      });
    } else if (commission.isWaived) {
      // Record COMMISSION_WAIVED with nominal or metadata tracking
      try {
        await LedgerService.createEntry({
          entryType: 'COMMISSION_WAIVED',
          direction: 'CREDIT',
          amountPaise: feePaise, // reference total gross fee waived
          userId: PLATFORM_SYSTEM_ID,
          referenceType: 'DIRECT_REQUEST',
          referenceId: request.id,
          idempotencyKey: `COMMISSION_WAIVED_${request.id}`,
          status: 'COMPLETED',
          metadata: {
            waived: true,
            reason: 'FOUNDING_EXPLORER_90_DAY_BENEFIT',
            explorer_id: request.explorer_id,
          },
        });
      } catch (waivedErr) {
        console.warn('[DirectRequestService] Commission waived entry logged:', waivedErr);
      }
    }

    // 6. Update direct_requests record
    const { data: updated, error: updateError } = await supabase
      .from('direct_requests')
      .update({
        state: 'COMPLETED',
        completed_at: new Date().toISOString(),
      })
      .eq('id', directRequestId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update direct request state: ${updateError.message}`);
    }

    return updated;
  }
}

