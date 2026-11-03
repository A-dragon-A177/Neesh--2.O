/**
 * NEESH V19 CASHFREE PAYMENT & WEBHOOK SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section AW.3, Section Y.10.4, Section AU.1, Step 3 & Step 4)
 * 
 * Non-negotiable rules:
 * 1. Webhooks have NO authenticated user. Identity is strictly bound internally via cashfree_order_id.
 * 2. HMAC-SHA256 signature verification over raw request body.
 * 3. x-webhook-timestamp must be within 300 seconds of server time.
 * 4. Always return HTTP 200 from the webhook endpoint.
 * 5. All security anomalies logged to security_audit_log.
 * 6. No credentials hardcoded or logged.
 */

import crypto from 'crypto';
import { supabase } from '../config/supabase';

export interface CreateCashfreeOrderInput {
  orderId: string;
  orderAmountPaise: bigint;
  customerDetails: {
    customerId: string;
    customerEmail?: string;
    customerPhone?: string;
    customerName?: string;
  };
  orderNote?: string;
  returnUrl?: string;
}

export interface CashfreeOrderResponse {
  cfOrderId: string;
  orderId: string;
  paymentSessionId: string;
  orderStatus: string;
  orderAmount: number;
}

export class CashfreeService {
  private static getBaseUrl(): string {
    const env = process.env.CASHFREE_ENV || 'SANDBOX';
    return env.toUpperCase() === 'PRODUCTION'
      ? 'https://api.cashfree.com/pg'
      : 'https://sandbox.cashfree.com/pg';
  }

  private static getAppId(): string {
    return process.env.CASHFREE_APP_ID || '';
  }

  private static getSecretKey(): string {
    return process.env.CASHFREE_SECRET_KEY || '';
  }

  private static getWebhookSecret(): string {
    return process.env.CASHFREE_WEBHOOK_SECRET || process.env.CASHFREE_SECRET_KEY || '';
  }

  /**
   * Creates an order with Cashfree PG.
   */
  public static async createOrder(input: CreateCashfreeOrderInput): Promise<CashfreeOrderResponse> {
    const appId = this.getAppId();
    const secretKey = this.getSecretKey();

    // Convert paise to rupees (e.g. 5880000 paise = 58800.00 rupees, or 840000 paise = 8400.00 rupees)
    // Note: paise / 100 = rupees
    const amountRupees = Number(input.orderAmountPaise) / 100;

    // Check if real Cashfree credentials exist
    if (!appId || !secretKey || appId.startsWith('mock') || appId === 'TEST_APP_ID') {
      console.log('[CashfreeService] Using Sandbox Simulated Order for development/test');
      return {
        cfOrderId: `cf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        orderId: input.orderId,
        paymentSessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
        orderStatus: 'ACTIVE',
        orderAmount: amountRupees,
      };
    }

    const url = `${this.getBaseUrl()}/orders`;
    const payload = {
      order_id: input.orderId,
      order_amount: amountRupees,
      order_currency: 'INR',
      customer_details: {
        customer_id: input.customerDetails.customerId,
        customer_email: input.customerDetails.customerEmail || 'founder@neesh.ai',
        customer_phone: input.customerDetails.customerPhone || '9999999999',
        customer_name: input.customerDetails.customerName || 'Neesh Founder',
      },
      order_meta: {
        return_url: input.returnUrl || 'https://neesh.ai/payment/status?order_id={order_id}',
      },
      order_note: input.orderNote || 'Neesh Sprint Day Purchase',
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': appId,
        'x-client-secret': secretKey,
        'x-api-version': '2026-01-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[CashfreeService] Cashfree create order failed:', response.status, errText);
      throw new Error(`Cashfree Order Creation Failed (${response.status}): ${errText}`);
    }

    const data: any = await response.json();
    return {
      cfOrderId: data.cf_order_id,
      orderId: data.order_id,
      paymentSessionId: data.payment_session_id,
      orderStatus: data.order_status,
      orderAmount: data.order_amount,
    };
  }

  /**
   * Verifies the Cashfree webhook HMAC-SHA256 signature against the raw payload.
   * Matches both base64 and hex encodings.
   */
  public static verifyWebhookSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    secretOverride?: string
  ): boolean {
    if (!signatureHeader || !rawBody) {
      return false;
    }

    const secret = secretOverride || this.getWebhookSecret();
    if (!secret) {
      console.warn('[CashfreeService] Warning: Webhook secret not configured');
      return false;
    }

    try {
      const hmac = crypto.createHmac('sha256', secret);
      hmac.update(rawBody);
      const computedBase64 = hmac.digest('base64');

      const hmacHex = crypto.createHmac('sha256', secret);
      hmacHex.update(rawBody);
      const computedHex = hmacHex.digest('hex');

      const sigClean = signatureHeader.trim();

      // Constant-time comparison for security
      const matchBase64 =
        sigClean.length === computedBase64.length &&
        crypto.timingSafeEqual(Buffer.from(sigClean), Buffer.from(computedBase64));

      const matchHex =
        sigClean.length === computedHex.length &&
        crypto.timingSafeEqual(Buffer.from(sigClean), Buffer.from(computedHex));

      return matchBase64 || matchHex;
    } catch (err) {
      console.error('[CashfreeService] Signature verification exception:', err);
      return false;
    }
  }

  /**
   * Verifies that the x-webhook-timestamp header is within 300 seconds of the server time.
   */
  public static verifyWebhookTimestamp(
    timestampHeader: string | undefined,
    currentServerTimeSeconds?: number
  ): boolean {
    if (!timestampHeader) {
      return false;
    }

    const ts = Number(timestampHeader);
    if (isNaN(ts) || ts <= 0) {
      return false;
    }

    // Support both seconds (10 digits) and milliseconds (13 digits)
    const webhookSeconds = ts > 10000000000 ? Math.floor(ts / 1000) : ts;
    const nowSeconds = currentServerTimeSeconds !== undefined
      ? currentServerTimeSeconds
      : Math.floor(Date.now() / 1000);

    const diff = Math.abs(nowSeconds - webhookSeconds);
    return diff <= 300;
  }

  /**
   * Logs a security anomaly to the security_audit_log table.
   */
  public static async logSecurityAudit(params: {
    eventType: string;
    sourceIp?: string;
    orderIdAttempted?: string;
    reason?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      await supabase.from('security_audit_log').insert({
        event_type: params.eventType,
        source_ip: params.sourceIp || null,
        order_id_attempted: params.orderIdAttempted || null,
        reason: params.reason || null,
        metadata: params.metadata || {},
      });
      console.log(`[CashfreeService:SecurityAudit] ${params.eventType} logged for order ${params.orderIdAttempted}`);
    } catch (err) {
      console.error('[CashfreeService] Failed to write security audit log:', err);
    }
  }
}

