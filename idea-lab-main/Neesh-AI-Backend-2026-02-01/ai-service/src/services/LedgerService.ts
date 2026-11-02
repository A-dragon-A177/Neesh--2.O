/**
 * NEESH V19 LEDGER SERVICE (Section W.5 + X.4.5)
 * 
 * Non-negotiable rules:
 * 1. Append-only ledger: No UPDATE or DELETE is ever executed.
 * 2. All amounts in integer BigInt paise.
 * 3. Financial corrections are recorded as new REVERSAL rows pointing to source_entry_id.
 * 4. Idempotency enforced on idempotency_key.
 */

import { supabase } from '../config/supabase';
import { NotificationService } from './NotificationService';

export type LedgerDirection = 'CREDIT' | 'DEBIT';

export type LedgerEntryType =
  | 'SPRINT_DAY_PURCHASE'
  | 'SPRINT_DAY_PURCHASE_CONFIRMED'
  | 'SPRINT_DAY_PURCHASE_REVERSAL'
  | 'INTERACTION_FEE_DEBIT'
  | 'INTERACTION_FEE_CREDIT'
  | 'COMMISSION_CREDIT'
  | 'COMMISSION_WAIVED'
  | 'GUARANTEE_CREDIT'
  | 'EARNINGS_BASELINE_CREDIT'
  | 'ESCROW_HOLD'
  | 'ESCROW_HOLD_CONFIRMED'
  | 'ESCROW_RELEASE'
  | 'ESCROW_RETURN'
  | 'WITHDRAWAL_DEBIT';

export type LedgerReferenceType =
  | 'SPRINT'
  | 'INTERACTION'
  | 'DIRECT_REQUEST'
  | 'GUARANTEE_CLAIM'
  | 'BASELINE_CREDIT'
  | 'COMMISSION_WAIVED'
  | 'WITHDRAWAL';

export interface LedgerEntryRecord {
  id: string;
  entry_type: LedgerEntryType | string;
  direction: LedgerDirection;
  amount_paise: string | number; // String representation of BigInt from DB
  user_id: string;
  reference_type?: LedgerReferenceType | string | null;
  reference_id?: string | null;
  source_entry_id?: string | null;
  idempotency_key?: string | null;
  status: 'PENDING' | 'COMPLETED' | 'REVERSED';
  metadata?: Record<string, any>;
  created_at?: string;
}

export interface CreateLedgerEntryInput {
  entryType: LedgerEntryType | string;
  direction: LedgerDirection;
  amountPaise: bigint;
  userId: string;
  referenceType?: LedgerReferenceType | string;
  referenceId?: string;
  sourceEntryId?: string | null;
  idempotencyKey: string;
  status?: 'PENDING' | 'COMPLETED' | 'REVERSED';
  metadata?: Record<string, any>;
}

export class LedgerService {
  /**
   * Appends an immutable entry to ledger_entries.
   * If an entry with the idempotencyKey already exists, returns that existing entry.
   * For 0n paise (e.g. SCOUT free interactions), gracefully returns { success: true, skipped: true }.
   */
  public static async createEntry(input: CreateLedgerEntryInput): Promise<LedgerEntryRecord | { success: boolean; skipped: boolean }> {
    if (input.amountPaise === 0n) {
      // SCOUT interaction — no ledger entries needed
      return { success: true, skipped: true };
    }

    if (input.amountPaise <= 0n) {
      throw new Error(`Invalid amount_paise: ${input.amountPaise}. Amount must be strictly positive.`);
    }

    if (!input.userId) {
      throw new Error('user_id is required for ledger entry');
    }

    if (!input.idempotencyKey) {
      throw new Error('idempotencyKey is required for ledger entry');
    }

    // Require source_entry_id for confirmation and reversal entries
    const isFollowupEntry =
      input.entryType.endsWith('_CONFIRMED') ||
      input.entryType.endsWith('_REVERSAL') ||
      input.entryType === 'ESCROW_RETURN' ||
      input.entryType === 'ESCROW_RELEASE';

    if (isFollowupEntry && !input.sourceEntryId) {
      console.warn(
        `[LedgerService] Warning: Followup entry ${input.entryType} should reference a source_entry_id.`
      );
    }

    // 1. Idempotency Check: see if entry already exists
    const { data: existing, error: checkError } = await supabase
      .from('ledger_entries')
      .select('*')
      .eq('idempotency_key', input.idempotencyKey)
      .maybeSingle();

    if (checkError) {
      console.error('[LedgerService] Idempotency check query failed:', checkError);
      throw new Error(`Ledger idempotency check failed: ${checkError.message}`);
    }

    if (existing) {
      console.log(`[LedgerService] Duplicate idempotency key ${input.idempotencyKey} detected; returning existing record`);
      return existing as LedgerEntryRecord;
    }

    // 2. Insert new entry (Append-Only)
    const newRecord = {
      entry_type: input.entryType,
      direction: input.direction,
      amount_paise: input.amountPaise.toString(),
      user_id: input.userId,
      reference_type: input.referenceType || null,
      reference_id: input.referenceId || null,
      source_entry_id: input.sourceEntryId || null,
      idempotency_key: input.idempotencyKey,
      status: input.status || 'COMPLETED',
      metadata: input.metadata || {},
    };

    const { data: inserted, error: insertError } = await supabase
      .from('ledger_entries')
      .insert(newRecord)
      .select()
      .single();

    if (insertError) {
      // Check if another concurrent process just inserted with this idempotency key
      if (insertError.code === '23505') {
        const { data: concurrentExisting } = await supabase
          .from('ledger_entries')
          .select('*')
          .eq('idempotency_key', input.idempotencyKey)
          .single();

        if (concurrentExisting) {
          return concurrentExisting as LedgerEntryRecord;
        }
      }
      console.error('[LedgerService] Failed to insert ledger entry:', insertError);
      throw new Error(`Failed to append ledger entry: ${insertError.message}`);
    }

    if (input.entryType === 'INTERACTION_FEE_CREDIT' && input.status === 'COMPLETED') {
      try {
        const amtRupees = Math.round(Number(input.amountPaise) / 100);
        NotificationService.send({
          type: 'EARNINGS_CREDITED',
          recipientEmail: input.metadata?.email,
          data: {
            amountRupees: amtRupees,
            balanceRupees: amtRupees,
          },
        }).catch(() => {});
      } catch (err) {
        // Non-blocking
      }
    }

    return inserted as LedgerEntryRecord;
  }

  /**
   * Computes the available account balance in integer paise for a user.
   * Balance = Sum(CREDIT) - Sum(DEBIT) for COMPLETED entries.
   */
  public static async calculateAccountBalance(userId: string): Promise<bigint> {
    if (!userId) {
      throw new Error('userId is required to calculate account balance');
    }

    const { data: entries, error } = await supabase
      .from('ledger_entries')
      .select('direction, amount_paise, status')
      .eq('user_id', userId)
      .eq('status', 'COMPLETED');

    if (error) {
      console.error(`[LedgerService] Failed to fetch entries for balance of user ${userId}:`, error);
      throw new Error(`Failed to calculate balance: ${error.message}`);
    }

    return this.computeBalanceFromEntries(entries || []);
  }

  /**
   * Alias for calculateAccountBalance.
   */
  public static async getAccountBalance(userId: string): Promise<bigint> {
    return this.calculateAccountBalance(userId);
  }

  /**
   * Pure deterministic computation of balance from a list of entry items.
   * Useful for unit testing and verification.
   */
  public static computeBalanceFromEntries(
    entries: Array<{ direction: string; amount_paise: string | number | bigint; status?: string }>
  ): bigint {
    let balance = 0n;

    for (const entry of entries) {
      if (entry.status && entry.status !== 'COMPLETED') {
        continue;
      }
      const amount = BigInt(entry.amount_paise.toString());
      if (entry.direction === 'CREDIT') {
        balance += amount;
      } else if (entry.direction === 'DEBIT') {
        balance -= amount;
      }
    }

    return balance;
  }

  /**
   * V20 helper for escrow hold (SCOUT interactions with 0n are skipped)
   */
  public static async holdEscrow(amountPaise: bigint, data?: any): Promise<{ success: boolean; skipped?: boolean } | LedgerEntryRecord> {
    if (amountPaise === 0n) {
      // SCOUT interaction — no ledger entries needed
      return { success: true, skipped: true };
    }
    return this.createEntry({
      entryType: 'ESCROW_HOLD',
      direction: 'DEBIT',
      amountPaise,
      userId: data?.userId || data?.founderId,
      referenceType: data?.referenceType || 'INTERACTION',
      referenceId: data?.referenceId || data?.interactionId,
      idempotencyKey: data?.idempotencyKey || `ESCROW_HOLD_${Date.now()}`,
      status: 'COMPLETED',
      metadata: data?.metadata,
    });
  }

  /**
   * V20 helper for escrow release (SCOUT interactions with 0n are skipped)
   */
  public static async releaseEscrow(amountPaise: bigint, data?: any): Promise<{ success: boolean; skipped?: boolean } | LedgerEntryRecord> {
    if (amountPaise === 0n) {
      // SCOUT interaction — no ledger entries needed
      return { success: true, skipped: true };
    }
    return this.createEntry({
      entryType: 'ESCROW_RELEASE',
      direction: 'CREDIT',
      amountPaise,
      userId: data?.userId,
      referenceType: data?.referenceType || 'DIRECT_REQUEST',
      referenceId: data?.referenceId,
      idempotencyKey: data?.idempotencyKey || `ESCROW_RELEASE_${Date.now()}`,
      status: 'COMPLETED',
      metadata: data?.metadata,
    });
  }

  /**
   * V20 helper for commission credit (SCOUT interactions with 0n are skipped)
   */
  public static async creditCommission(amountPaise: bigint, data?: any): Promise<{ success: boolean; skipped?: boolean } | LedgerEntryRecord> {
    if (amountPaise === 0n) {
      // SCOUT interaction — no ledger entries needed
      return { success: true, skipped: true };
    }
    return this.createEntry({
      entryType: 'COMMISSION_CREDIT',
      direction: 'CREDIT',
      amountPaise,
      userId: data?.userId,
      referenceType: data?.referenceType || 'DIRECT_REQUEST',
      referenceId: data?.referenceId,
      idempotencyKey: data?.idempotencyKey || `COMM_CREDIT_${Date.now()}`,
      status: 'COMPLETED',
      metadata: data?.metadata,
    });
  }
}

