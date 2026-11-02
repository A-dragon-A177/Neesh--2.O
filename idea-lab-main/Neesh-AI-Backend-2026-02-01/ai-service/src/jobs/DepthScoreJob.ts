/**
 * NEESH V19 DEPTH SCORE JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF.1, Task 5)
 * 
 * Schedule: 0 *\/6 * * * (every 6 hours)
 * Formula:
 *   length_score     = MIN(content.length / 500, 1.0)
 *   keyword_count    = count of domain_keywords found in content (case-insensitive)
 *   specificity_mult = MIN(1.0 + keyword_count * 0.1, 1.5)
 *   depth_score      = ROUND(length_score * specificity_mult, 3)   // range: [0.000, 1.500]
 */

import { supabase } from '../config/supabase';
import domainKeywords from '../config/domain-keywords.json';

/**
 * Pure deterministic computation of Depth Score heuristic (AF.1).
 */
export function calculateDepthScore(content: string, domainSlug: string = 'b2b-saas'): number {
  if (!content) return 0;

  // 1. Length Score: MIN(length / 500, 1.0)
  const lengthScore = Math.min(content.length / 500, 1.0);

  // 2. Keyword Count (case-insensitive regex match)
  const keywords: string[] =
    (domainKeywords as Record<string, string[]>)[domainSlug.toLowerCase()] ||
    (domainKeywords as Record<string, string[]>)['b2b-saas'] ||
    [];

  let keywordCount = 0;
  const contentLower = content.toLowerCase();

  for (const kw of keywords) {
    const kwLower = kw.toLowerCase();
    // Word boundary or substring check for acronyms/terms
    const regex = new RegExp(`\\b${kwLower}\\b`, 'i');
    if (regex.test(content) || contentLower.includes(kwLower)) {
      keywordCount++;
    }
  }

  // 3. Specificity Multiplier: MIN(1.0 + keyword_count * 0.1, 1.5)
  const specificityMult = Math.min(1.0 + keywordCount * 0.1, 1.5);

  // 4. Depth Score: ROUND(length_score * specificity_mult, 3)
  const rawScore = lengthScore * specificityMult;
  return Math.round(rawScore * 1000) / 1000;
}

export async function runDepthScoreJob(): Promise<{ evaluated: number; updated: number }> {
  console.log('[DepthScoreJob] Scanning un-scored interactions...');

  try {
    const { data: pendingInteractions, error } = await supabase
      .from('interactions')
      .select('id, content, depth_score, state, spotlight_id, spark_id, spotlights(domain), sparks(domain)')
      .is('depth_score', null)
      .in('state', ['PENDING', 'RESPONDED', 'RATED', 'COMPLETE'])
      .limit(200);

    if (error) {
      console.error('[DepthScoreJob] Query error:', error);
      return { evaluated: 0, updated: 0 };
    }

    if (!pendingInteractions || pendingInteractions.length === 0) {
      return { evaluated: 0, updated: 0 };
    }

    let updatedCount = 0;

    for (const item of pendingInteractions) {
      const domain =
        (item.spotlights as any)?.domain ||
        (item.sparks as any)?.domain ||
        'b2b-saas';

      const score = calculateDepthScore(item.content, domain);

      const { error: updateErr } = await supabase
        .from('interactions')
        .update({ depth_score: score })
        .eq('id', item.id);

      if (!updateErr) {
        updatedCount++;
      }
    }

    console.log(`[DepthScoreJob] Completed. Evaluated: ${pendingInteractions.length}, Updated: ${updatedCount}`);
    return { evaluated: pendingInteractions.length, updated: updatedCount };
  } catch (err) {
    console.error('[DepthScoreJob] Unhandled exception:', err);
    return { evaluated: 0, updated: 0 };
  }
}

