/**
 * Monthly Counter Reset Cron
 *
 * Runs on the 1st of each month at 0:05 UTC. Resets monthlyContentGens and
 * monthlyApiCalls to 0 for all organizations so tier-based quotas reset
 * cleanly. Runs BEFORE the monthly report cron (6 AM) so reports snapshot
 * the previous month's true totals before reset.
 */

import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';

export async function runMonthlyCounterReset(): Promise<void> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  console.log('[MonthlyReset] Resetting monthly counters for all organizations...');

  try {
    const result = await prisma.organization.updateMany({
      where: { isActive: true },
      data: {
        monthlyContentGens: 0,
        monthlyApiCalls: 0,
      },
    });

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[MonthlyReset] Reset counters for ${result.count} orgs in ${duration}s`,
    );
  } catch (err: any) {
    console.error('[MonthlyReset] Fatal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

export function createMonthlyCounterResetJob(): CronJob {
  // 1st of month at 00:05 UTC — early enough that no content generations
  // happen before reset, but after midnight so it's clearly a new month.
  const job = new CronJob('5 0 1 * *', runMonthlyCounterReset, null, true, 'UTC');
  console.log('[MonthlyReset] Cron scheduled: 5 0 1 * * (1st of month 00:05 UTC)');
  console.log(`[MonthlyReset] Next run: ${job.nextDate().toISO()}`);
  return job;
}
