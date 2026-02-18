/**
 * Weekly Internal Linking Job
 *
 * Runs weekly on Sundays at 3 AM UTC to optimize internal link graph.
 *
 * Schedule: 0 3 * * 0 (Every Sunday at 3 AM)
 *
 * Actions:
 * - Find orphan pages
 * - Balance link distribution
 * - Add contextual internal links
 * - Update Shopify blog posts
 */

import { CronJob } from 'cron';
import { PrismaClient } from '@prisma/client';
import InternalLinkingWorkflow from '../workflows/internal-linking-workflow';

const prisma = new PrismaClient();

/**
 * Weekly internal linking task
 */
async function runWeeklyLinking() {
  console.log('[WeeklyLinkingJob] Starting weekly link optimization at', new Date().toISOString());

  try {
    // Get all organizations with published content
    const organizations = await prisma.organization.findMany({
      where: {
        qaPages: { // Use 'qaPages' instead of 'qAPages'
          some: {
            status: 'published',
          },
        },
      },
      select: { id: true, shopifyDomain: true },
    });

    console.log(`[WeeklyLinkingJob] Found ${organizations.length} organizations with published content`);

    let totalOrgsProcessed = 0;
    let totalLinksAdded = 0;
    let totalOrphanPagesFixed = 0;

    // Process each organization
    for (const org of organizations) {
      try {
        console.log(`[WeeklyLinkingJob] Optimizing link graph for ${org.shopifyDomain}`);

        const workflow = new InternalLinkingWorkflow(prisma);

        const result = await workflow.execute({
          organizationId: org.id,
          targetInboundLinks: 3,
          maxLinksPerUpdate: 50,
        });

        if (result.success) {
          totalOrgsProcessed++;
          totalLinksAdded += result.totalLinksAdded;
          totalOrphanPagesFixed += result.orphanPagesFixed;

          console.log(`[WeeklyLinkingJob] ${org.shopifyDomain} - Added ${result.totalLinksAdded} links, Fixed ${result.orphanPagesFixed} orphans`);

          // Log to organization-specific analytics
          // TODO: Add LinkingJobLog model to schema
          // await prisma.linkingJobLog.create({
          //   data: {
          //     organizationId: org.id,
          //     orphanPagesFound: result.orphanPagesFound,
          //     orphanPagesFixed: result.orphanPagesFixed,
          //     underlinkedPagesFound: result.underlinkedPagesFound,
          //     underlinkedPagesFixed: result.underlinkedPagesFixed,
          //     totalLinksAdded: result.totalLinksAdded,
          //     pagesUpdated: result.pagesUpdated,
          //     linkGraphMetrics: result.linkGraphMetrics,
          //     runAt: new Date(),
          //   },
          // });
        } else {
          console.error(`[WeeklyLinkingJob] Failed for ${org.shopifyDomain}:`, result.error);
        }
      } catch (error) {
        console.error(`[WeeklyLinkingJob] Error processing ${org.shopifyDomain}:`, error);
      }

      // Add delay between organizations to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }

    console.log('[WeeklyLinkingJob] Weekly linking complete');
    console.log(`[WeeklyLinkingJob] Summary: ${totalOrgsProcessed} orgs, ${totalLinksAdded} links, ${totalOrphanPagesFixed} orphans fixed`);

    // Log to global cron job log
    // TODO: Add CronJobLog model to schema
    // await prisma.cronJobLog.create({
    //   data: {
    //     jobName: 'weekly-linking',
    //     status: 'success',
    //     organizationsProcessed: totalOrgsProcessed,
    //     metadata: {
    //       totalLinksAdded,
    //       totalOrphanPagesFixed,
    //     },
    //     startedAt: new Date(),
    //     completedAt: new Date(),
    //   },
    // });
  } catch (error) {
    console.error('[WeeklyLinkingJob] Weekly linking failed:', error);

    // Log failure
    // TODO: Add CronJobLog model to schema
    // try {
    //   await prisma.cronJobLog.create({
    //     data: {
    //       jobName: 'weekly-linking',
    //       status: 'failed',
    //       error: error instanceof Error ? error.message : 'Unknown error',
    //       startedAt: new Date(),
    //       completedAt: new Date(),
    //     },
    //   });
    // } catch (logError) {
    //   console.error('[WeeklyLinkingJob] Failed to log error:', logError);
    // }
  }
}

/**
 * Create and start weekly linking cron job
 */
export function createWeeklyLinkingJob() {
  // Schedule: Every Sunday at 3 AM UTC
  const job = new CronJob(
    '0 3 * * 0',
    runWeeklyLinking,
    null, // onComplete
    true, // start immediately
    'UTC' // timezone
  );

  console.log('[WeeklyLinkingJob] Scheduled to run weekly on Sundays at 3 AM UTC');
  console.log('[WeeklyLinkingJob] Next run:', job.nextDate().toJSDate());

  return job;
}

// If running as standalone process
if (require.main === module) {
  console.log('[WeeklyLinkingJob] Starting weekly linking job scheduler...');

  const job = createWeeklyLinkingJob();

  // Run immediately on startup (for testing)
  const runImmediately = process.argv.includes('--now');
  if (runImmediately) {
    console.log('[WeeklyLinkingJob] Running immediately...');
    runWeeklyLinking().then(() => {
      console.log('[WeeklyLinkingJob] Manual run complete');
    });
  }

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('[WeeklyLinkingJob] SIGTERM received, stopping...');
    job.stop();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('[WeeklyLinkingJob] SIGINT received, stopping...');
    job.stop();
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default createWeeklyLinkingJob;
