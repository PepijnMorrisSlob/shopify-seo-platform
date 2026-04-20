/**
 * Cron Jobs Index
 *
 * Centralized management of all scheduled tasks
 */

import { createDailyOptimizationJob } from './daily-optimization-job';
import { createWeeklyLinkingJob } from './weekly-linking-job';
import { createGSCSyncJob } from './gsc-sync-job';
import { createContentPruningJob } from './content-pruning-job';
import { createImageCleanupJob } from './image-cleanup-job';
import { createMonthlyReportJob } from './monthly-report-job';
import { createMonthlyCounterResetJob } from './monthly-counter-reset-job';
import { CronJob } from 'cron';

let dailyOptimizationJob: CronJob | null = null;
let weeklyLinkingJob: CronJob | null = null;
let gscSyncJob: CronJob | null = null;
let contentPruningJob: CronJob | null = null;
let imageCleanupJob: CronJob | null = null;
let monthlyReportJob: CronJob | null = null;
let monthlyCounterResetJob: CronJob | null = null;

/**
 * Start all cron jobs
 */
export function startAllCronJobs() {
  console.log('[CronJobs] Starting all scheduled jobs...');

  // GSC data sync (1 AM UTC — must run before optimization)
  gscSyncJob = createGSCSyncJob();

  // Daily optimization (2 AM UTC)
  dailyOptimizationJob = createDailyOptimizationJob();

  // Weekly linking (Sunday 3 AM UTC)
  weeklyLinkingJob = createWeeklyLinkingJob();

  // Weekly content pruning (Sunday 4 AM UTC — after linking)
  contentPruningJob = createContentPruningJob();

  // Daily image cleanup (5 AM UTC — delete DRAFT images older than 7 days)
  imageCleanupJob = createImageCleanupJob();

  // Monthly counter reset (1st of month at 00:05 UTC — BEFORE monthly report)
  monthlyCounterResetJob = createMonthlyCounterResetJob();

  // Monthly PDF report (1st of month at 6 AM UTC)
  monthlyReportJob = createMonthlyReportJob();

  console.log('[CronJobs] All cron jobs started');
}

/**
 * Stop all cron jobs
 */
export function stopAllCronJobs() {
  console.log('[CronJobs] Stopping all scheduled jobs...');

  if (dailyOptimizationJob) {
    dailyOptimizationJob.stop();
    dailyOptimizationJob = null;
  }

  if (weeklyLinkingJob) {
    weeklyLinkingJob.stop();
    weeklyLinkingJob = null;
  }

  if (gscSyncJob) {
    gscSyncJob.stop();
    gscSyncJob = null;
  }

  if (contentPruningJob) {
    contentPruningJob.stop();
    contentPruningJob = null;
  }

  if (imageCleanupJob) {
    imageCleanupJob.stop();
    imageCleanupJob = null;
  }

  if (monthlyReportJob) {
    monthlyReportJob.stop();
    monthlyReportJob = null;
  }

  if (monthlyCounterResetJob) {
    monthlyCounterResetJob.stop();
    monthlyCounterResetJob = null;
  }

  console.log('[CronJobs] All cron jobs stopped');
}

/**
 * Get cron job status
 */
export function getCronJobStatus() {
  return {
    dailyOptimization: {
      running: dailyOptimizationJob?.running || false,
      nextRun: dailyOptimizationJob?.nextDate()?.toJSDate() || null,
    },
    weeklyLinking: {
      running: weeklyLinkingJob?.running || false,
      nextRun: weeklyLinkingJob?.nextDate()?.toJSDate() || null,
    },
    gscSync: {
      running: gscSyncJob?.running || false,
      nextRun: gscSyncJob?.nextDate()?.toJSDate() || null,
    },
    contentPruning: {
      running: contentPruningJob?.running || false,
      nextRun: contentPruningJob?.nextDate()?.toJSDate() || null,
    },
    imageCleanup: {
      running: imageCleanupJob?.running || false,
      nextRun: imageCleanupJob?.nextDate()?.toJSDate() || null,
    },
    monthlyReport: {
      running: monthlyReportJob?.running || false,
      nextRun: monthlyReportJob?.nextDate()?.toJSDate() || null,
    },
    monthlyCounterReset: {
      running: monthlyCounterResetJob?.running || false,
      nextRun: monthlyCounterResetJob?.nextDate()?.toJSDate() || null,
    },
  };
}

// If running as standalone process
if (require.main === module) {
  console.log('[CronJobs] Starting cron job scheduler...');

  startAllCronJobs();

  console.log('[CronJobs] Status:', getCronJobStatus());

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[CronJobs] SIGTERM received, shutting down...');
    stopAllCronJobs();
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[CronJobs] SIGINT received, shutting down...');
    stopAllCronJobs();
    process.exit(0);
  });

  console.log('[CronJobs] Cron scheduler is running. Press Ctrl+C to stop.');
}

export {
  createDailyOptimizationJob,
  createWeeklyLinkingJob,
  createGSCSyncJob,
  createContentPruningJob,
  createImageCleanupJob,
  createMonthlyReportJob,
  createMonthlyCounterResetJob,
};
