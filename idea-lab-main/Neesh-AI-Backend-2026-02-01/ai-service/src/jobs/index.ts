/**
 * NEESH V19 BACKGROUND JOBS (Section AF)
 * 
 * Phase 2: DomainMetricsJob and PioneerGradeEvaluationJob wired to real logic.
 * Remaining 7 jobs run as stubs with logging.
 */

import cron, { ScheduledTask } from 'node-cron';
import { runDomainMetricsJob } from './DomainMetricsJob';
import { runPioneerGradeEvaluationJob } from './PioneerGradeEvaluationJob';
import { runSpotlightPromotionJob } from './SpotlightPromotionJob';
import { runSparkIgnitionJob } from './SparkIgnitionJob';
import { runSprintExpiryJob } from './SprintExpiryJob';
import { runGuaranteeWindowCloseJob } from './GuaranteeWindowCloseJob';
import { runFoundingExplorerBaselineJob } from './FoundingExplorerBaselineJob';
import { runSitemapGenerationJob } from './SitemapGenerationJob';
import { runDepthScoreJob } from './DepthScoreJob';

export interface JobDefinition {
  readonly name: string;
  readonly schedule: string;
  readonly description: string;
}

export const V19_JOB_DEFINITIONS: readonly JobDefinition[] = [
  {
    name: 'SparkIgnitionJob',
    schedule: '0 * * * *', // every hour
    description: 'Checks Sparks aged >72h with <3 interactions and invites 3 Pioneer Explorers',
  },
  {
    name: 'SpotlightPromotionJob',
    schedule: '*/30 * * * *', // every 30 minutes
    description: 'Promotes Sparks with >=5 interactions to Spotlight eligibility',
  },
  {
    name: 'SprintExpiryJob',
    schedule: '0 * * * *', // every hour
    description: 'Transitions active Sprint sessions whose ends_at has elapsed',
  },
  {
    name: 'GuaranteeWindowCloseJob',
    schedule: '0 0 * * *', // daily 00:00
    description: 'Closes Day 8 claim windows and marks expired sessions completed',
  },
  {
    name: 'DomainMetricsJob',
    schedule: '0 3 * * *', // daily 03:00 (REAL in Phase 2)
    description: 'Recomputes active founders, explorers, and interaction counts for domain_stats',
  },
  {
    name: 'PioneerGradeEvaluationJob',
    schedule: '0 */2 * * *', // every 2 hours (REAL in Phase 2)
    description: 'Re-evaluates WAR and advancement/demotion thresholds for Explorer grades',
  },
  {
    name: 'FoundingExplorerBaselineJob',
    schedule: '0 4 * * *', // daily 04:00
    description: 'Credits ₹2,500 earnings baseline to qualifying Founding Explorers at Day 30',
  },
  {
    name: 'SitemapGenerationJob',
    schedule: '0 5 * * *', // daily 05:00
    description: 'Regenerates public sitemaps including sitemap-pioneers.xml',
  },
  {
    name: 'DepthScoreJob',
    schedule: '0 */6 * * *', // every 6 hours
    description: 'Computes deterministic depth score heuristic for interactions',
  },
] as const;

export function runJobStub(jobName: string): void {
  const startTime = Date.now();
  const isoTimestamp = new Date().toISOString();
  console.log(`[JOB:START] ${jobName} triggered at ${isoTimestamp}`);
  console.log(`[JOB:STUB] ${jobName} — not yet implemented (Phase 3/4)`);
  const duration = Date.now() - startTime;
  console.log(`[JOB:END] ${jobName} completed in ${duration}ms`);
}

const scheduledTasks: Map<string, ScheduledTask> = new Map();

/**
 * Dispatches the job handler based on job name.
 */
export async function executeJob(jobName: string): Promise<void> {
  if (jobName === 'DomainMetricsJob') {
    await runDomainMetricsJob();
  } else if (jobName === 'PioneerGradeEvaluationJob') {
    await runPioneerGradeEvaluationJob();
  } else if (jobName === 'SpotlightPromotionJob') {
    await runSpotlightPromotionJob();
  } else if (jobName === 'SparkIgnitionJob') {
    await runSparkIgnitionJob();
  } else if (jobName === 'SprintExpiryJob') {
    await runSprintExpiryJob();
  } else if (jobName === 'GuaranteeWindowCloseJob') {
    await runGuaranteeWindowCloseJob();
  } else if (jobName === 'FoundingExplorerBaselineJob') {
    await runFoundingExplorerBaselineJob();
  } else if (jobName === 'SitemapGenerationJob') {
    await runSitemapGenerationJob();
  } else if (jobName === 'DepthScoreJob') {
    await runDepthScoreJob();
  } else {
    runJobStub(jobName);
  }
}

/**
 * Initializes and schedules all 9 V19 background jobs.
 */
export function initV19BackgroundJobs(): Map<string, ScheduledTask> {
  console.log('[JOBS] Initializing 9 V19 background jobs (DomainMetricsJob & PioneerGradeEvaluationJob are ACTIVE)...');

  for (const job of V19_JOB_DEFINITIONS) {
    if (cron.validate(job.schedule)) {
      const task = cron.schedule(job.schedule, async () => {
        await executeJob(job.name);
      });
      scheduledTasks.set(job.name, task);
      console.log(`[JOBS] Registered ${job.name} with schedule: '${job.schedule}'`);
    } else {
      console.error(`[JOBS] Invalid cron schedule for ${job.name}: '${job.schedule}'`);
    }
  }

  console.log(`[JOBS] Successfully registered ${scheduledTasks.size}/9 background jobs`);
  return scheduledTasks;
}

export function stopV19BackgroundJobs(): void {
  for (const [name, task] of scheduledTasks.entries()) {
    task.stop();
  }
  scheduledTasks.clear();
  console.log('[JOBS] Stopped all V19 background jobs');
}
