/**
 * Daily Optimization Job
 *
 * Runs daily at 2 AM UTC to optimize underperforming content.
 *
 * Schedule: 0 2 * * * (Every day at 2 AM)
 *
 * Actions:
 * - Scan all published Q&A pages
 * - Identify pages with declining rankings/traffic
 * - Queue optimization jobs
 * - Send summary report
 */

import { CronJob } from 'cron';
import { PrismaClient } from '@prisma/client';
import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis.config';

const prisma = new PrismaClient();

/**
 * Daily optimization task
 */
async function runDailyOptimization() {
  console.log('[DailyOptimizationJob] Starting daily optimization at', new Date().toISOString());

  try {
    // Get all organizations
    const organizations = await prisma.organization.findMany({
      select: { id: true, shopifyDomain: true },
    });

    console.log(`[DailyOptimizationJob] Found ${organizations.length} organizations`);

    // Create optimization queue
    const optimizationQueue = new Queue('optimization', {
      connection: getRedisConnection() as any, // Type cast to resolve BullMQ/ioredis version mismatch
    });

    let totalJobsQueued = 0;

    // Queue optimization job for each organization
    for (const org of organizations) {
      try {
        // Check if organization has any published pages
        const publishedPagesCount = await prisma.qAPage.count({
          where: {
            organizationId: org.id,
            status: 'published',
          },
        });

        if (publishedPagesCount === 0) {
          console.log(`[DailyOptimizationJob] Skipping ${org.shopifyDomain} - no published pages`);
          continue;
        }

        // Add optimization job to queue
        await optimizationQueue.add(
          'daily-optimization',
          {
            organizationId: org.id,
            forceOptimize: false, // Only optimize if criteria met
          },
          {
            priority: 5,
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 60000,
            },
          }
        );

        totalJobsQueued++;
        console.log(`[DailyOptimizationJob] Queued optimization for ${org.shopifyDomain}`);
      } catch (error) {
        console.error(`[DailyOptimizationJob] Failed to queue optimization for ${org.shopifyDomain}:`, error);
      }
    }

    console.log(`[DailyOptimizationJob] Queued ${totalJobsQueued} optimization jobs`);

    // Log to database
    // TODO: Add CronJobLog model to schema
    // await prisma.cronJobLog.create({
    //   data: {
    //     jobName: 'daily-optimization',
    //     status: 'success',
    //     organizationsProcessed: totalJobsQueued,
    //     startedAt: new Date(),
    //     completedAt: new Date(),
    //   },
    // });
  } catch (error) {
    console.error('[DailyOptimizationJob] Daily optimization failed:', error);

    // Log failure to database
    // TODO: Add CronJobLog model to schema
    // try {
    //   await prisma.cronJobLog.create({
    //     data: {
    //       jobName: 'daily-optimization',
    //       status: 'failed',
    //       error: error instanceof Error ? error.message : 'Unknown error',
    //       startedAt: new Date(),
    //       completedAt: new Date(),
    //     },
    //   });
    // } catch (logError) {
    //   console.error('[DailyOptimizationJob] Failed to log error:', logError);
    // }
  }
}

/**
 * Create and start daily optimization cron job
 */
export function createDailyOptimizationJob() {
  // Schedule: Every day at 2 AM UTC
  const job = new CronJob(
    '0 2 * * *',
    runDailyOptimization,
    null, // onComplete
    true, // start immediately
    'UTC' // timezone
  );

  console.log('[DailyOptimizationJob] Scheduled to run daily at 2 AM UTC');
  console.log('[DailyOptimizationJob] Next run:', job.nextDate().toJSDate());

  return job;
}

// If running as standalone process
if (require.main === module) {
  console.log('[DailyOptimizationJob] Starting daily optimization job scheduler...');

  const job = createDailyOptimizationJob();

  // Run immediately on startup (for testing)
  const runImmediately = process.argv.includes('--now');
  if (runImmediately) {
    console.log('[DailyOptimizationJob] Running immediately...');
    runDailyOptimization().then(() => {
      console.log('[DailyOptimizationJob] Manual run complete');
    });
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[DailyOptimizationJob] SIGTERM received, stopping...');
    job.stop();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[DailyOptimizationJob] SIGINT received, stopping...');
    job.stop();
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default createDailyOptimizationJob;
