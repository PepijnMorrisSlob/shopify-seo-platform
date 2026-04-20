/**
 * Image Cleanup Cron
 *
 * Runs daily at 5 AM UTC (after the 4 AM content pruning cron). Deletes
 * DRAFT images older than 7 days to prevent unbounded storage growth on
 * the Railway volume.
 *
 * DRAFT → auto-delete after 7 days
 * SAVED → never auto-deleted (user explicitly kept)
 * PUBLISHED → never auto-deleted (in use by content)
 */

import { CronJob } from 'cron';
import { ImageStorageService } from '../services/image-storage-service';

export async function runImageCleanupJob(): Promise<void> {
  const startTime = Date.now();
  console.log('[ImageCleanup] Starting DRAFT image cleanup...');

  try {
    const service = new ImageStorageService();
    const deleted = await service.cleanupOldDrafts(7);

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[ImageCleanup] Completed in ${duration}s. Deleted ${deleted} DRAFT images.`,
    );
  } catch (err: any) {
    console.error('[ImageCleanup] Fatal:', err.message);
  }
}

export function createImageCleanupJob(): CronJob {
  const job = new CronJob('0 5 * * *', runImageCleanupJob, null, true, 'UTC');
  console.log('[ImageCleanup] Cron scheduled: 0 5 * * * (daily at 5 AM UTC)');
  console.log(`[ImageCleanup] Next run: ${job.nextDate().toISO()}`);
  return job;
}
