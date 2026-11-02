/**
 * NEESH V19 COMMISSION SERVICE
 * Reference: NEESH_V19_MASTER_PRD.md (Section W.3, Section W.4, Section O.3)
 * 
 * Non-negotiable rules:
 * 1. Strict commission tiers:
 *    - <= ₹1,000 (100,000 paise): 20%
 *    - ₹1,001 to ₹3,000 (100,001 to 300,000 paise): 15%
 *    - ₹3,001 to ₹6,000 (300,001 to 600,000 paise): 12%
 *    - ₹6,001 to ₹10,000 (600,001 to 1,000,000 paise): 10%
 * 2. BigInt integer arithmetic enforces strict mathematical FLOOR division.
 * 3. Founding Explorer Override: 0% platform commission within the 90-day window.
 *    Explorer receives 100% of the fee.
 */

import { supabase } from '../config/supabase';
import {
  COMMISSION_TIERS,
  calculateCommission as calcCommissionUtil,
} from '../constants/pricing';

export interface CommissionResult {
  readonly feePaise: bigint;
  readonly commissionPaise: bigint;
  readonly explorerPayoutPaise: bigint;
  readonly ratePercent: bigint;
  readonly isWaived: boolean;
}

export class CommissionService {
  /**
   * Pure calculation of commission and explorer payout using BigInt FLOOR division.
   */
  public static calculateCommission(
    feePaise: bigint,
    isFoundingExplorerOverride: boolean = false
  ): CommissionResult {
    const res = calcCommissionUtil(feePaise, isFoundingExplorerOverride);
    return {
      feePaise: res.grossFeePaise,
      commissionPaise: res.commissionPaise,
      explorerPayoutPaise: res.explorerPaise,
      ratePercent: res.commissionRatePercent,
      isWaived: isFoundingExplorerOverride,
    };
  }

  /**
   * Determines if an explorer has active Founding Explorer commission-free status (90 days).
   */
  public static async isFoundingExplorerCommissionFree(explorerId: string): Promise<boolean> {
    if (!explorerId) return false;

    try {
      const { data, error } = await supabase
        .from('founding_explorer_registrations')
        .select('commission_free_until')
        .eq('explorer_id', explorerId)
        .maybeSingle();

      if (error || !data) {
        return false;
      }

      const commissionFreeUntil = new Date(data.commission_free_until).getTime();
      return commissionFreeUntil > Date.now();
    } catch (err) {
      console.warn('[CommissionService] Error checking founding explorer registration:', err);
      return false;
    }
  }

  /**
   * Resolves fee commission for a specific explorer, factoring in Founding Explorer status.
   */
  public static async getCommissionForExplorer(
    feePaise: bigint,
    explorerId: string
  ): Promise<CommissionResult> {
    const isWaived = await this.isFoundingExplorerCommissionFree(explorerId);
    return this.calculateCommission(feePaise, isWaived);
  }
}

