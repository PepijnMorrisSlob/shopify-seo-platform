/**
 * Monthly Report Cron
 *
 * Runs on the 1st of each month at 6 AM UTC. For each active organization,
 * generates a PDF report for the previous month and saves it to the Railway
 * volume (/app/uploads/reports/) so clients can download from their dashboard.
 *
 * Email delivery is deferred to a future phase (requires SendGrid/SES
 * wiring + template system). For now reports are simply persisted.
 */

import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import { promises as fs } from 'fs';
import { join } from 'path';
import { ReportGenerationService } from '../services/report-generation-service';

const REPORTS_DIR =
  (process.env.UPLOAD_DIR || '/app/uploads') + '/reports';

export async function runMonthlyReportJob(): Promise<void> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  console.log('[MonthlyReport] Starting monthly report generation...');

  try {
    await fs.mkdir(REPORTS_DIR, { recursive: true });

    const orgs = await prisma.organization.findMany({
      where: { isActive: true },
      select: { id: true, shopifyDomain: true },
    });

    console.log(`[MonthlyReport] Generating reports for ${orgs.length} orgs`);

    const service = new ReportGenerationService(prisma);
    const previousMonth = new Date();
    previousMonth.setMonth(previousMonth.getMonth() - 1, 1);

    let generated = 0;
    let failed = 0;

    for (const org of orgs) {
      try {
        const { buffer, filename } = await service.generateMonthlyPDF({
          organizationId: org.id,
          month: previousMonth,
        });
        const path = join(REPORTS_DIR, filename);
        await fs.writeFile(path, buffer);
        generated++;
        console.log(
          `[MonthlyReport] ${org.shopifyDomain}: ${(buffer.length / 1024).toFixed(1)}KB → ${filename}`,
        );
      } catch (err: any) {
        failed++;
        console.error(
          `[MonthlyReport] Failed for ${org.shopifyDomain}:`,
          err.message,
        );
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[MonthlyReport] Done in ${duration}s. Generated ${generated}, failed ${failed}.`,
    );
  } catch (err: any) {
    console.error('[MonthlyReport] Fatal:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

export function createMonthlyReportJob(): CronJob {
  // 1st of month at 6 AM UTC
  const job = new CronJob('0 6 1 * *', runMonthlyReportJob, null, true, 'UTC');
  console.log('[MonthlyReport] Cron scheduled: 0 6 1 * * (1st of month 6 AM UTC)');
  console.log(`[MonthlyReport] Next run: ${job.nextDate().toISO()}`);
  return job;
}
