/**
 * GSC Data Sync Cron Job
 *
 * Runs daily at 1 AM UTC (before the daily optimization cron at 2 AM).
 * For each organization with Google Search Console connected:
 * 1. Fetches last 3 days of search analytics (GSC has ~48hr data delay)
 * 2. Matches page URLs to QAPage and Product records
 * 3. Upserts into ContentPerformance table
 * 4. Updates QAPage/Product aggregate metrics (impressions, clicks, CTR, position)
 * 5. Syncs keyword ranking data from GSC queries
 */

import { PrismaClient } from '@prisma/client';
import { CronJob } from 'cron';
import {
  GoogleSearchConsoleService,
} from '../services/google-search-console-service';

export async function runGSCSyncJob(): Promise<void> {
  const prisma = new PrismaClient();
  const startTime = Date.now();

  console.log('[GSC Sync] Starting daily GSC data sync...');

  try {
    // 1. Get all orgs with GSC connected
    const orgs = await prisma.organization.findMany({
      where: {
        gscRefreshToken: { not: null },
        gscSiteUrl: { not: null },
        isActive: true,
      },
    });

    console.log(`[GSC Sync] Found ${orgs.length} organizations with GSC connected`);

    if (orgs.length === 0) {
      console.log('[GSC Sync] No organizations with GSC connected. Skipping.');
      return;
    }

    let totalPagesSynced = 0;
    let totalQueriesSynced = 0;
    let failedOrgs = 0;

    for (const org of orgs) {
      try {
        console.log(`[GSC Sync] Processing ${org.shopifyDomain}...`);

        // 2. Initialize GSC service with org's tokens
        const clientId = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET;
        const backendUrl = process.env.BACKEND_URL || 'http://localhost:3003';

        if (!clientId || !clientSecret) {
          console.error('[GSC Sync] Missing GSC OAuth credentials in env vars');
          break;
        }

        const gscService = new GoogleSearchConsoleService({
          clientId,
          clientSecret,
          redirectUri: `${backendUrl}/api/gsc/callback`,
        });

        gscService.setTokens({
          access_token: org.gscAccessToken || '',
          refresh_token: org.gscRefreshToken!,
          scope: 'https://www.googleapis.com/auth/webmasters.readonly',
          token_type: 'Bearer',
          expiry_date: org.gscTokenExpiry?.getTime() || 0,
        });

        // Refresh token if expired
        if (!org.gscTokenExpiry || org.gscTokenExpiry.getTime() < Date.now()) {
          try {
            const newTokens = await gscService.refreshAccessToken();
            await prisma.organization.update({
              where: { id: org.id },
              data: {
                gscAccessToken: newTokens.access_token,
                gscTokenExpiry: new Date(newTokens.expiry_date),
              },
            });
          } catch (error: any) {
            console.error(`[GSC Sync] Token refresh failed for ${org.shopifyDomain}:`, error.message);
            failedOrgs++;
            continue;
          }
        }

        // 3. Fetch last 3 days (GSC has ~48hr data delay)
        const days = 3;
        const endDate = new Date();
        endDate.setDate(endDate.getDate() - 2);

        const [pageData, queryData] = await Promise.all([
          gscService.getTopPages(org.gscSiteUrl!, 500, days),
          gscService.getTopQueries(org.gscSiteUrl!, 500, days),
        ]);

        // 4. Match GSC pages to QAPage records
        const qaPages = await prisma.qAPage.findMany({
          where: { organizationId: org.id, shopifyUrl: { not: null } },
        });

        for (const page of pageData) {
          const qaPage = qaPages.find(
            (qp) => qp.shopifyUrl && page.page.includes(qp.shopifyUrl),
          );
          if (!qaPage) continue;

          // Upsert ContentPerformance
          const dateOnly = new Date(endDate.toISOString().split('T')[0]);
          await prisma.contentPerformance.upsert({
            where: {
              pageId_date: { pageId: qaPage.id, date: dateOnly },
            },
            create: {
              pageId: qaPage.id,
              date: dateOnly,
              impressions: page.impressions,
              clicks: page.clicks,
              ctr: page.ctr,
              avgPosition: page.position,
            },
            update: {
              impressions: page.impressions,
              clicks: page.clicks,
              ctr: page.ctr,
              avgPosition: page.position,
            },
          });

          // Update QAPage aggregate metrics
          await prisma.qAPage.update({
            where: { id: qaPage.id },
            data: {
              monthlyImpressions: page.impressions,
              monthlyClicks: page.clicks,
              ctr: page.ctr,
              currentPosition: Math.round(page.position),
              bestPosition: Math.min(
                qaPage.bestPosition || 999,
                Math.round(page.position),
              ),
            },
          });

          totalPagesSynced++;
        }

        // 5. Sync keyword data from GSC queries
        for (const query of queryData) {
          // Find existing keyword or create
          const existing = await prisma.keyword.findFirst({
            where: {
              organizationId: org.id,
              keyword: query.query,
            },
          });

          if (existing) {
            await prisma.keyword.update({
              where: { id: existing.id },
              data: {
                previousPosition: existing.currentPosition,
                currentPosition: Math.round(query.position),
                impressions: query.impressions,
                clicks: query.clicks,
                ctr: query.ctr,
                dataSource: 'google_search_console',
                lastFetchedAt: new Date(),
              },
            });
          } else {
            await prisma.keyword.create({
              data: {
                organizationId: org.id,
                keyword: query.query,
                currentPosition: Math.round(query.position),
                impressions: query.impressions,
                clicks: query.clicks,
                ctr: query.ctr,
                dataSource: 'google_search_console',
                lastFetchedAt: new Date(),
              },
            });
          }

          totalQueriesSynced++;
        }

        // 6. Match product URLs from GSC
        const products = await prisma.product.findMany({
          where: { organizationId: org.id },
        });

        for (const page of pageData) {
          const product = products.find(
            (p) => page.page.includes(`/products/${p.handle}`),
          );
          if (!product) continue;

          await prisma.product.update({
            where: { id: product.id },
            data: {
              impressions: page.impressions,
              clicks: page.clicks,
              ctr: page.ctr,
              avgPosition: page.position,
            },
          });
        }

        console.log(
          `[GSC Sync] ${org.shopifyDomain}: ${pageData.length} pages, ${queryData.length} queries processed`,
        );
      } catch (error: any) {
        console.error(
          `[GSC Sync] Failed for ${org.shopifyDomain}:`,
          error.message,
        );
        failedOrgs++;
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);
    console.log(
      `[GSC Sync] Completed in ${duration}s. Pages: ${totalPagesSynced}, Queries: ${totalQueriesSynced}, Failed orgs: ${failedOrgs}`,
    );
  } catch (error: any) {
    console.error('[GSC Sync] Fatal error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Create the cron job instance.
 * Schedule: Every day at 1 AM UTC (before optimization cron at 2 AM).
 */
export function createGSCSyncJob(): CronJob {
  const job = new CronJob('0 1 * * *', runGSCSyncJob, null, true, 'UTC');
  console.log('[GSC Sync] Cron scheduled: 0 1 * * * (daily at 1 AM UTC)');
  console.log(`[GSC Sync] Next run: ${job.nextDate().toISO()}`);
  return job;
}
