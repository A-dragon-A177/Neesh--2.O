/**
 * NEESH V19 DOMAIN METRICS BACKGROUND JOB
 * Reference: NEESH_V19_MASTER_PRD.md (Section AF, Section N)
 * 
 * Schedule: 0 3 * * * (daily 03:00)
 * Recomputes active sprint founder counts and open status for all domains.
 */

import { DomainGatingService } from '../services/DomainGatingService';

export async function runDomainMetricsJob(): Promise<void> {
  const startTime = Date.now();
  const isoTimestamp = new Date().toISOString();
  console.log(`[JOB:START] DomainMetricsJob triggered at ${isoTimestamp}`);

  try {
    await DomainGatingService.syncAllDomainMetrics();
  } catch (err) {
    console.error('[JOB:ERROR] DomainMetricsJob failed:', err);
  }

  const duration = Date.now() - startTime;
  console.log(`[JOB:END] DomainMetricsJob completed in ${duration}ms`);
}

