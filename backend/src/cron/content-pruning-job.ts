/**
 * Weekly Content Pruning Cron
 *
 * Runs every Sunday at 4 AM UTC (after the linking cron at 3 AM). For each
 * organization, identifies pruning candidates and automatically queues the
 * "update" (refresh) action for candidates flagged as stale. Remove/redirect
 * actions are LOGGED but NOT auto-executed — they require human approval to
 * prevent accidentally removing content that still has strategic value.
 */

import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { ContentPruningService } from '../services/content-pruning-service';

export async function runContentPruningJob(): Promise<void> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  console.log('[ContentPruning] Starting weekly pruning scan...');

  try {
    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, shopifyDomain: true },
    });

    console.log(`[ContentPruning] Scanning ${orgs.length} organizations`);

    const service = new ContentPruningService(prisma);
    let totalUpdatesQueued = 0;
    let totalRemoveFlagged = 0;
    let totalRedirectFlagged = 0;

    for (const org of orgs) {
      try {
        const report = await service.identifyCandidates(org.id);

        console.log(
          `[ContentPruning] ${org.shopifyDomain}: update=${report.summary.update}, redirect=${report.summary.redirect}, remove=${report.summary.remove}, retain=${report.summary.retain}`,
        );

        // Auto-execute updates (refresh). These are safe and reversible.
        for (const c of report.candidates) {
          if (c.recommendation === 'update') {
            try {
              await service.executePrune(c.pageId, 'update');
              totalUpdatesQueued++;
            } catch (err: any) {
              console.error(
                `[ContentPruning] Failed to queue update for ${c.pageId}:`,
                err.message,
              );
            }
          } else if (c.recommendation === 'remove') {
            totalRemoveFlagged++;
            console.log(
              `[ContentPruning] FLAGGED FOR REMOVAL (awaiting approval): ${c.pageId} — ${c.reason}`,
            );
          } else if (c.recommendation === 'redirect') {
            totalRedirectFlagged++;
            console.log(
              `[ContentPruning] FLAGGED FOR REDIRECT: ${c.pageId} → ${c.redirectTarget || 'target TBD'} — ${c.reason}`,
            );
          }
        }
      } catch (err: any) {
        console.error(
          `[ContentPruning] Failed for ${org.shopifyDomain}:`,
          err.message,
        );
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[ContentPruning] Done in ${duration}s. Updates queued: ${totalUpdatesQueued}, Remove flagged: ${totalRemoveFlagged}, Redirect flagged: ${totalRedirectFlagged}`,
    );
  } catch (err: any) {
    console.error('[ContentPruning] Fatal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

export function createContentPruningJob(): CronJob {
  const job = new CronJob('0 4 * * 0', runContentPruningJob, null, true, 'UTC');
  console.log('[ContentPruning] Cron scheduled: 0 4 * * 0 (Sundays 4 AM UTC)');
  console.log(`[ContentPruning] Next run: ${job.nextDate().toISO()}`);
  return job;
}
