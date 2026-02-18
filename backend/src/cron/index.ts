/**
 * Cron Jobs Index
 *
 * Centralized management of all scheduled tasks
 */

import { createDailyOptimizationJob } from './daily-optimization-job';
import { createWeeklyLinkingJob } from './weekly-linking-job';
import { CronJob } from 'cron';

let dailyOptimizationJob: CronJob | null = null;
let weeklyLinkingJob: CronJob | null = null;

/**
 * Start all cron jobs
 */
export function startAllCronJobs() {
  console.log('[CronJobs] Starting all scheduled jobs...');

  // Daily optimization (2 AM UTC)
  dailyOptimizationJob = createDailyOptimizationJob();

  // Weekly linking (Sunday 3 AM UTC)
  weeklyLinkingJob = createWeeklyLinkingJob();

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

export { createDailyOptimizationJob, createWeeklyLinkingJob };
