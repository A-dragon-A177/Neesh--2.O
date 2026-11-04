/**
 * NEESH V19 FOUNDING EXPLORER BASELINE JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section O.1, Section O.3, Section W.5)
 * 
 * Schedule: 0 4 * * * (daily 04:00)
 * Purpose: Evaluates Founding Explorers who have completed their first 30 days.
 * If cumulative earnings < ₹2,500 (250,000 paise), credits the exact shortfall
 * to their account via EARNINGS_BASELINE_CREDIT.
 */

import { supabase } from '../config/supabase';
import { FOUNDING_EXPLORER_BASELINE_PAISE } from '../constants/pricing';
import { LedgerService } from '../services/LedgerService';

export interface BaselineShortfallResult {
  qualifiesForCredit: boolean;
  cumulativeEarningsPaise: bigint;
  shortfallPaise: bigint;
}

/**
 * Pure calculation of the Day 30 earnings shortfall.
 */
export function calculateEarningsShortfall(
  cumulativeEarningsPaise: bigint,
  baselineTargetPaise: bigint = FOUNDING_EXPLORER_BASELINE_PAISE
): BaselineShortfallResult {
  if (cumulativeEarningsPaise >= baselineTargetPaise) {
    return {
      qualifiesForCredit: false,
      cumulativeEarningsPaise,
      shortfallPaise: 0n,
    };
  }

  const shortfallPaise = baselineTargetPaise - cumulativeEarningsPaise;
  return {
    qualifiesForCredit: true,
    cumulativeEarningsPaise,
    shortfallPaise,
  };
}

export async function runFoundingExplorerBaselineJob(): Promise<{
  evaluated: number;
  credited: number;
  totalCreditedPaise: bigint;
}> {
  console.log('[FoundingExplorerBaselineJob] Scanning 30-day Founding Explorer earnings baselines...');

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const { data: eligibleRegistrations, error } = await supabase
      .from('founding_explorer_registrations')
      .select('id, explorer_id, enrolled_at, earnings_baseline_credited')
      .eq('earnings_baseline_credited', false)
      .lte('enrolled_at', thirtyDaysAgo);

    if (error) {
      console.error('[FoundingExplorerBaselineJob] Query error:', error);
      return { evaluated: 0, credited: 0, totalCreditedPaise: 0n };
    }

    if (!eligibleRegistrations || eligibleRegistrations.length === 0) {
      return { evaluated: 0, credited: 0, totalCreditedPaise: 0n };
    }

    let creditedCount = 0;
    let totalCreditedPaise = 0n;

    for (const reg of eligibleRegistrations) {
      // Fetch explorer user_id
      const { data: explorer } = await supabase
        .from('explorer_profiles')
        .select('user_id')
        .eq('id', reg.explorer_id)
        .maybeSingle();

      if (!explorer?.user_id) {
        console.warn(`[FoundingExplorerBaselineJob] User not found for explorer ${reg.explorer_id}`);
        continue;
      }

      // Gate: must have >= 5 interactions within first 30 days of enrollment
      const thirtyDayWindowEnd = new Date(
        new Date(reg.enrolled_at).getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString();
      const { count: interactionCount } = await supabase
        .from('interactions')
        .select('*', { count: 'exact', head: true })
        .eq('explorer_id', reg.explorer_id)
        .gte('created_at', reg.enrolled_at)
        .lte('created_at', thirtyDayWindowEnd);

      if (!interactionCount || interactionCount < 5) {
        console.log(`[FoundingExplorerBaselineJob] Explorer ${reg.explorer_id} has ${interactionCount ?? 0}/5 required interactions in first 30 days. Skipping baseline credit.`);
        continue;
      }

      // Query cumulative interaction fee earnings from ledger
      const { data: earningsEntries } = await supabase
        .from('ledger_entries')
        .select('amount_paise')
        .eq('user_id', explorer.user_id)
        .eq('entry_type', 'INTERACTION_FEE_CREDIT')
        .eq('status', 'COMPLETED');

      let cumulativeEarningsPaise = 0n;
      if (earningsEntries && earningsEntries.length > 0) {
        for (const entry of earningsEntries) {
          cumulativeEarningsPaise += BigInt(entry.amount_paise.toString());
        }
      }

      const shortfallCalc = calculateEarningsShortfall(cumulativeEarningsPaise);

      if (shortfallCalc.qualifiesForCredit && shortfallCalc.shortfallPaise > 0n) {
        // Append EARNINGS_BASELINE_CREDIT
        await LedgerService.createEntry({
          entryType: 'EARNINGS_BASELINE_CREDIT',
          direction: 'CREDIT',
          amountPaise: shortfallCalc.shortfallPaise,
          userId: explorer.user_id,
          referenceType: 'BASELINE_CREDIT',
          referenceId: reg.id,
          idempotencyKey: `BASELINE_CREDIT_${reg.id}`,
          status: 'COMPLETED',
          metadata: {
            cumulative_earnings_paise: cumulativeEarningsPaise.toString(),
            baseline_target_paise: FOUNDING_EXPLORER_BASELINE_PAISE.toString(),
            shortfall_paise: shortfallCalc.shortfallPaise.toString(),
          },
        });

        await supabase
          .from('founding_explorer_registrations')
          .update({
            earnings_baseline_credited: true,
            baseline_credit_amount_paise: shortfallCalc.shortfallPaise.toString(),
          })
          .eq('id', reg.id);

        creditedCount++;
        totalCreditedPaise += shortfallCalc.shortfallPaise;
        console.log(`[FoundingExplorerBaselineJob] Credited ₹${Number(shortfallCalc.shortfallPaise) / 100} to explorer ${reg.explorer_id} (shortfall)`);
      } else {
        // Target was reached or exceeded, mark credited with 0
        await supabase
          .from('founding_explorer_registrations')
          .update({
            earnings_baseline_credited: true,
            baseline_credit_amount_paise: '0',
          })
          .eq('id', reg.id);

        console.log(`[FoundingExplorerBaselineJob] Explorer ${reg.explorer_id} met baseline with earnings of ₹${Number(cumulativeEarningsPaise) / 100}`);
      }
    }

    console.log(`[FoundingExplorerBaselineJob] Completed. Evaluated: ${eligibleRegistrations.length}, Credited: ${creditedCount}`);
    return { evaluated: eligibleRegistrations.length, credited: creditedCount, totalCreditedPaise };
  } catch (err) {
    console.error('[FoundingExplorerBaselineJob] Exception:', err);
    return { evaluated: 0, credited: 0, totalCreditedPaise: 0n };
  }
}

