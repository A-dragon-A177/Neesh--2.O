/**
 * NEESH V19 NOTIFICATION SERVICE (RESEND INTEGRATION)
 * Reference: NEESH_V19_MASTER_PRD.md (Phase 5, Task 4)
 * 
 * Non-negotiable rules:
 * 1. Non-blocking: failures must never throw or roll back caller transactions.
 * 2. 8 notification types supported.
 * 3. From address: notifications@neesh.ai
 * 4. Resend API key loaded from RESEND_API_KEY environment variable.
 */

import { Resend } from 'resend';

export type NotificationType =
  | 'SPARK_FIRST_INTERACTION'
  | 'SPRINT_ACTIVATED'
  | 'SPRINT_DAY6_REMINDER'
  | 'GUARANTEE_CLAIMABLE'
  | 'DIRECT_REQUEST_RECEIVED'
  | 'DIRECT_REQUEST_ACCEPTED'
  | 'PIONEER_GRADE_UPGRADED'
  | 'EARNINGS_CREDITED';

export interface SendNotificationParams {
  type: NotificationType;
  recipientEmail?: string;
  data: Record<string, any>;
}

export class NotificationService {
  private static resendClient: Resend | null = null;
  private static readonly FROM_EMAIL = 'notifications@neesh.ai';

  // In-memory test event logger for verification suites
  public static sentNotificationsLog: Array<{
    type: NotificationType;
    to: string;
    subject: string;
    timestamp: Date;
  }> = [];

  private static getClient(): Resend | null {
    if (!this.resendClient) {
      const apiKey = process.env.RESEND_API_KEY;
      if (apiKey && apiKey.trim().length > 0) {
        this.resendClient = new Resend(apiKey);
      }
    }
    return this.resendClient;
  }

  /**
   * Main dispatch method. Guaranteed non-blocking.
   */
  public static async send(params: SendNotificationParams): Promise<{ success: boolean; id?: string }> {
    try {
      const { type, recipientEmail, data } = params;
      const targetEmail = recipientEmail || data.email || 'user@example.com';

      const payload = this.buildEmailPayload(type, data);

      // Log notification event in memory
      this.sentNotificationsLog.push({
        type,
        to: targetEmail,
        subject: payload.subject,
        timestamp: new Date(),
      });

      console.log(`[NotificationService] Sending ${type} to ${targetEmail} | Subject: "${payload.subject}"`);

      const client = this.getClient();
      if (!client) {
        console.warn('[NotificationService] RESEND_API_KEY not configured or mock mode. Notification logged.');
        return { success: true, id: `mock-${Date.now()}` };
      }

      // Fire email via Resend
      const result = await client.emails.send({
        from: this.FROM_EMAIL,
        to: targetEmail,
        subject: payload.subject,
        html: payload.html,
      });

      return { success: true, id: result.data?.id };
    } catch (err: any) {
      // Non-blocking catch: log error and never throw
      console.error(`[NotificationService] Non-blocking notification failure (${params.type}):`, err?.message || err);
      return { success: false };
    }
  }

  /**
   * Builds subject and HTML templates for each of the 8 notification types.
   */
  public static buildEmailPayload(type: NotificationType, data: Record<string, any>): { subject: string; html: string } {
    switch (type) {
      case 'SPARK_FIRST_INTERACTION': {
        const domain = data.domain || 'Startup';
        const snippet = (data.content || '').substring(0, 100);
        return {
          subject: 'Your startup just got its first response on Neesh',
          html: `
            <h2>New response in ${domain}</h2>
            <p>A verified Pioneer has reviewed your concept:</p>
            <blockquote style="border-left: 3px solid #6366f1; padding-left: 12px; color: #475569;">"${snippet}..."</blockquote>
            <p><a href="https://neesh.ai/spark/${data.sparkId || ''}">View your Spark & Response →</a></p>
          `,
        };
      }

      case 'SPRINT_ACTIVATED': {
        const endDate = data.endDate || 'in 7 days';
        return {
          subject: 'Your Sprint is live — 7 days, 3 Pioneer interactions guaranteed',
          html: `
            <h2>Your 7-Day Sprint is Active!</h2>
            <p>Sprint end date: <strong>${endDate}</strong></p>
            <p>Pioneer count: <strong>0 / 3</strong></p>
            <p>Remember: If you don't receive at least 3 high-depth Pioneer interactions during your 7-day Sprint, 100% of your credits will be refunded.</p>
            <p><a href="https://neesh.ai/dashboard/founder">Open Founder Dashboard →</a></p>
          `,
        };
      }

      case 'SPRINT_DAY6_REMINDER': {
        const count = data.interactionCount ?? 1;
        return {
          subject: `Your Sprint ends tomorrow — ${count}/3 Pioneer interactions so far`,
          html: `
            <h2>Sprint Day 6 Status Update</h2>
            <p>Your Sprint concludes in 24 hours. Current verified Pioneer interactions: <strong>${count} / 3</strong>.</p>
            <p>Check your dashboard to engage with responding Pioneers.</p>
            <p><a href="https://neesh.ai/dashboard/founder">View Sprint Status →</a></p>
          `,
        };
      }

      case 'GUARANTEE_CLAIMABLE': {
        const deadline = data.claimClosesAt ? new Date(data.claimClosesAt).toLocaleDateString() : 'in 13 days';
        const amount = data.amountRupees || 588;
        return {
          subject: `Your Sprint guarantee is ready to claim — deadline ${deadline}`,
          html: `
            <h2>Sprint Guarantee Claim Available</h2>
            <p>Your Sprint concluded with fewer than 3 verified Pioneer interactions.</p>
            <p>You are eligible to claim a full guarantee refund of <strong>₹${amount}</strong> back to your Neesh balance.</p>
            <p>Claim window closes: <strong>${deadline}</strong></p>
            <p><a href="https://neesh.ai/sprint/${data.sprintId || ''}">Claim Guarantee Refund Now →</a></p>
          `,
        };
      }

      case 'DIRECT_REQUEST_RECEIVED': {
        const domain = data.domain || 'Domain';
        const snippet = (data.description || data.message || '').substring(0, 100);
        const fee = data.feeRupees || 500;
        return {
          subject: `${domain} founder sent you a direct request`,
          html: `
            <h2>New Direct Request (${domain})</h2>
            <p>A founder has requested your direct review for a fee of <strong>₹${fee}</strong>.</p>
            <blockquote style="border-left: 3px solid #3b82f6; padding-left: 12px; color: #475569;">"${snippet}..."</blockquote>
            <p>You have 48 hours to accept or decline this request.</p>
            <p><a href="https://neesh.ai/dashboard/explorer">Review Request in Dashboard →</a></p>
          `,
        };
      }

      case 'DIRECT_REQUEST_ACCEPTED': {
        const explorerName = data.explorerName || 'A verified Pioneer';
        const fee = data.feeRupees || 500;
        return {
          subject: 'Your request was accepted — get ready to interact',
          html: `
            <h2>Direct Request Accepted</h2>
            <p><strong>${explorerName}</strong> has accepted your request. Fee locked: <strong>₹${fee}</strong>.</p>
            <p>Their detailed feedback will arrive shortly.</p>
            <p><a href="https://neesh.ai/dashboard/founder">View Interaction →</a></p>
          `,
        };
      }

      case 'PIONEER_GRADE_UPGRADED': {
        const newGrade = data.newGrade || 'RISING';
        const feeRange = data.feeRange || '₹200 – ₹800';
        return {
          subject: `Your Pioneer grade just upgraded to ${newGrade}`,
          html: `
            <h2>Congratulations! You are now a ${newGrade} Pioneer.</h2>
            <p>Your objective Pioneer Points have unlocked a new grade tier:</p>
            <ul>
              <li>Grade: <strong>${newGrade}</strong></li>
              <li>New Fee Range: <strong>${feeRange}</strong></li>
            </ul>
            <p><a href="https://neesh.ai/dashboard/explorer">View Your Updated Profile →</a></p>
          `,
        };
      }

      case 'EARNINGS_CREDITED': {
        const amount = data.amountRupees || 0;
        const balance = data.balanceRupees || amount;
        return {
          subject: `₹${amount} credited to your Neesh account`,
          html: `
            <h2>Payment Credited</h2>
            <p><strong>₹${amount}</strong> has been credited to your Neesh balance for completing a verified review.</p>
            <p>Current balance: <strong>₹${balance}</strong></p>
            <p><a href="https://neesh.ai/dashboard/wallet">View Wallet & Ledger →</a></p>
          `,
        };
      }

      default:
        return {
          subject: 'Update from Neesh',
          html: '<p>You have a new notification from Neesh.</p>',
        };
    }
  }
}

