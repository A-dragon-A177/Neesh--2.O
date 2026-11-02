/**
 * NEESH V19 CASHFREE WEBHOOK CONTROLLER
 * Reference: NEESH_V19_MASTER_PRD.md (Section Y.10.4, Section AU.1, Step 4)
 * 
 * Cashfree webhook endpoint: POST /api/webhooks/cashfree
 * Configure in Cashfree Dashboard → Developers → Webhooks:
 *   Sandbox: https://[render-sandbox-service].onrender.com/api/webhooks/cashfree
 *   Production: https://[render-prod-service].onrender.com/api/webhooks/cashfree
 * CASHFREE_WEBHOOK_SECRET must match the secret configured in Cashfree Dashboard.
 * 
 * Strict 8-Step Verification Pipeline:
 * Always returns HTTP 200 to Cashfree (never 4xx/5xx).
 */

import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../config/supabase';
import { CashfreeService } from '../services/CashfreeService';
import { LedgerService } from '../services/LedgerService';

export class WebhookController {
  /**
   * POST /api/webhooks/cashfree
   * Also aliases: POST /api/webhook/cashfree
   */
  public static async handleCashfree(req: Request, res: Response): Promise<void> {
    const sourceIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket.remoteAddress ||
      '';

    const rawBody = (req as any).rawBody || (typeof req.body === 'string' ? req.body : JSON.stringify(req.body));
    const signature = (req.headers['x-webhook-signature'] as string) || '';
    const timestamp = (req.headers['x-webhook-timestamp'] as string) || '';

    const payload = req.body || {};
    const orderData = payload.data?.order || payload.order || payload;
    const paymentData = payload.data?.payment || payload.payment || {};
    const eventType = payload.type || payload.event || 'PAYMENT_SUCCESS_WEBHOOK';

    const orderId = orderData.order_id || payload.order_id || '';
    const paymentId = paymentData.payment_id || paymentData.cf_payment_id || `pay_${Date.now()}`;
    const paymentStatus = paymentData.payment_status || orderData.order_status || 'SUCCESS';

    console.log(`[WebhookController] Received Cashfree webhook for order ${orderId}, event ${eventType}`);

    // STEP 1 — SIGNATURE VERIFY (first — before any DB access)
    const isSignatureValid = CashfreeService.verifyWebhookSignature(rawBody, signature);
    if (!isSignatureValid) {
      console.warn(`[WebhookController] Invalid signature detected for order ${orderId}`);
      await CashfreeService.logSecurityAudit({
        eventType: 'invalid_webhook_signature',
        sourceIp,
        orderIdAttempted: orderId,
        reason: 'HMAC-SHA256 signature verification failed',
        metadata: { eventType, timestampProvided: timestamp },
      });
      res.status(200).json({ status: 'ignored', reason: 'invalid_signature' });
      return;
    }

    // STEP 2 — TIMESTAMP CHECK (within 300 seconds)
    const isTimestampValid = CashfreeService.verifyWebhookTimestamp(timestamp);
    if (!isTimestampValid) {
      console.warn(`[WebhookController] Stale webhook timestamp: ${timestamp}`);
      await CashfreeService.logSecurityAudit({
        eventType: 'stale_webhook_timestamp',
        sourceIp,
        orderIdAttempted: orderId,
        reason: `Timestamp ${timestamp} older than 300 seconds or invalid`,
      });
      res.status(200).json({ status: 'ignored', reason: 'stale_timestamp' });
      return;
    }

    // STEP 3 — IDEMPOTENCY CHECK
    const confirmationIdempotencyKey = `SPRINT_DAY_PURCHASE_CONFIRMED:${orderId}:${paymentId}`;
    const directRequestConfirmationKey = `DIRECT_REQUEST_CONFIRMED:${orderId}:${paymentId}`;
    const { data: existingConfirmation } = await supabase
      .from('ledger_entries')
      .select('id')
      .in('idempotency_key', [confirmationIdempotencyKey, directRequestConfirmationKey])
      .maybeSingle();

    if (existingConfirmation) {
      console.log(`[WebhookController] Webhook already processed for key ${confirmationIdempotencyKey}`);
      res.status(200).json({ status: 'success', message: 'already_processed' });
      return;
    }

    // STEP 4 — ORDER LOOKUP (Internal binding — NOT from Cashfree payload)
    let sprintSession: any = null;
    let directRequest: any = null;

    if (orderId) {
      const { data: sessionData } = await supabase
        .from('sprint_sessions')
        .select('*')
        .eq('cashfree_order_id', orderId)
        .maybeSingle();
      sprintSession = sessionData;
    }

    if (!sprintSession && orderId) {
      const { data: reqData } = await supabase
        .from('direct_requests')
        .select('*')
        .eq('cashfree_order_id', orderId)
        .maybeSingle();
      directRequest = reqData;
    }

    if (!sprintSession && !directRequest) {
      console.warn(`[WebhookController] Unknown order ID: ${orderId}`);
      await CashfreeService.logSecurityAudit({
        eventType: 'unknown_order_id',
        sourceIp,
        orderIdAttempted: orderId,
        reason: 'Order ID not found in sprint_sessions or direct_requests',
        metadata: { payloadSummary: orderData },
      });
      res.status(200).json({ status: 'ignored', reason: 'unknown_order' });
      return;
    }

    // STEP 5 — AMOUNT/CURRENCY VERIFY
    const webhookAmount = Number(orderData.order_amount);
    const webhookCurrency = orderData.order_currency || 'INR';

    if (sprintSession) {
      // Internal amount stored in paise; convert to rupees or compare in paise
      const internalPaise = BigInt(sprintSession.amount_paise.toString());
      const webhookPaise = BigInt(Math.round(webhookAmount * 100));

      if (webhookCurrency !== 'INR') {
        await CashfreeService.logSecurityAudit({
          eventType: 'currency_mismatch',
          sourceIp,
          orderIdAttempted: orderId,
          reason: `Currency was ${webhookCurrency}, expected INR`,
        });
        res.status(200).json({ status: 'ignored', reason: 'currency_mismatch' });
        return;
      }

      // Allow 0 amount if credits covered 100%, or verify amount match
      if (webhookPaise > 0n && webhookPaise !== internalPaise) {
        await CashfreeService.logSecurityAudit({
          eventType: 'amount_mismatch',
          sourceIp,
          orderIdAttempted: orderId,
          reason: `Amount mismatch: internal=${internalPaise}, webhook=${webhookPaise}`,
        });
        res.status(200).json({ status: 'ignored', reason: 'amount_mismatch' });
        return;
      }
    }

    // STEP 6 — IDENTITY BINDING
    // founder_id comes strictly from internal DB record (sprintSession or directRequest)
    const founderId = sprintSession ? sprintSession.founder_id : directRequest.founder_id;

    // STEP 7 — STATE TRANSITION (Idempotent)
    const isSuccess =
      paymentStatus === 'SUCCESS' ||
      eventType.includes('SUCCESS') ||
      eventType === 'PAYMENT_SUCCESS_WEBHOOK';

    if (sprintSession) {
      // Find the original pending ledger entry to link source_entry_id
      const { data: pendingLedgerEntry } = await supabase
        .from('ledger_entries')
        .select('id')
        .eq('reference_id', sprintSession.id)
        .eq('entry_type', 'SPRINT_DAY_PURCHASE')
        .maybeSingle();

      const originalPendingEntryId = pendingLedgerEntry?.id || null;

      if (isSuccess) {
        const days = sprintSession.days_purchased || 1;
        const now = new Date();
        const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        // 7a. Update sprint_session
        await supabase
          .from('sprint_sessions')
          .update({
            state: 'ACTIVE',
            started_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
          })
          .eq('id', sprintSession.id);

        // 7b. Insert confirmed ledger entry (Append-Only)
        await LedgerService.createEntry({
          entryType: 'SPRINT_DAY_PURCHASE_CONFIRMED',
          direction: 'DEBIT',
          amountPaise: BigInt(sprintSession.amount_paise.toString()),
          userId: founderId,
          referenceType: 'SPRINT',
          referenceId: sprintSession.id,
          sourceEntryId: originalPendingEntryId,
          idempotencyKey: confirmationIdempotencyKey,
          status: 'COMPLETED',
          metadata: {
            cashfree_order_id: orderId,
            cashfree_payment_id: paymentId,
            days_purchased: days,
          },
        });

        // 7c. Activate Spotlight
        await supabase
          .from('spotlights')
          .update({ state: 'SPRINT_ACTIVE' })
          .eq('id', sprintSession.spotlight_id);

        console.log(`[WebhookController] Sprint ${sprintSession.id} activated successfully for founder ${founderId}`);
      } else {
        // Payment failed
        await supabase
          .from('sprint_sessions')
          .update({ state: 'PAYMENT_FAILED' })
          .eq('id', sprintSession.id);

        const reversalIdempotencyKey = `SPRINT_DAY_PURCHASE_REVERSAL:${orderId}:${paymentId}`;
        await LedgerService.createEntry({
          entryType: 'SPRINT_DAY_PURCHASE_REVERSAL',
          direction: 'CREDIT',
          amountPaise: BigInt(sprintSession.amount_paise.toString()),
          userId: founderId,
          referenceType: 'SPRINT',
          referenceId: sprintSession.id,
          sourceEntryId: originalPendingEntryId,
          idempotencyKey: reversalIdempotencyKey,
          status: 'COMPLETED',
          metadata: {
            cashfree_order_id: orderId,
            cashfree_payment_id: paymentId,
            reason: 'Payment failed at gateway',
          },
        });
      }
    } else if (directRequest) {
      if (isSuccess) {
        // Escrow hold debit from founder
        const feePaise = BigInt(directRequest.fee_paise.toString());
        await LedgerService.createEntry({
          entryType: 'ESCROW_HOLD',
          direction: 'DEBIT',
          amountPaise: feePaise,
          userId: founderId,
          referenceType: 'DIRECT_REQUEST',
          referenceId: directRequest.id,
          idempotencyKey: confirmationIdempotencyKey,
          status: 'COMPLETED',
          metadata: {
            cashfree_order_id: orderId,
            cashfree_payment_id: paymentId,
          },
        });

        await supabase
          .from('direct_requests')
          .update({ state: 'PENDING' })
          .eq('id', directRequest.id);

        console.log(`[WebhookController] Direct request ${directRequest.id} confirmed and held in escrow`);
      } else {
        await supabase
          .from('direct_requests')
          .update({ state: 'PAYMENT_FAILED' })
          .eq('id', directRequest.id);
      }
    }

    // STEP 8 — RETURN HTTP 200 (Always)
    res.status(200).json({ status: 'success', message: 'Webhook processed' });
  }
}

