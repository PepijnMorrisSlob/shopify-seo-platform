/**
 * Root Application Module
 * Shopify SEO Automation Platform
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';

// Controllers
import { HealthController } from './controllers/health.controller';
import { AuthController } from './controllers/auth.controller';
import { ProductsController } from './controllers/products.controller';
import { AnalyticsController } from './controllers/analytics.controller';
import { BusinessProfileController } from './controllers/business-profile.controller';
import { WebhookController } from './controllers/webhook.controller';
import { QuestionsController } from './controllers/questions.controller';
import { QAPagesController } from './controllers/qa-pages.controller';
import { CalendarController } from './controllers/calendar.controller';
import { ContentController } from './controllers/content.controller';
import { TopicalMapController } from './controllers/topical-map.controller';
import { BrandVisibilityController } from './controllers/brand-visibility.controller';
import { CompetitorsController } from './controllers/competitors.controller';
import { KnowledgeBaseController } from './controllers/knowledge-base.controller';
import { SEOAuditController } from './controllers/seo-audit.controller';
import { GSCController } from './controllers/gsc.controller';
import { AgencyController } from './controllers/agency.controller';
import { ImagesController } from './controllers/images.controller';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // Task scheduling
    ScheduleModule.forRoot(),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
  ],
  controllers: [
    HealthController,
    AuthController,
    ProductsController,
    AnalyticsController,
    BusinessProfileController,
    WebhookController,
    QuestionsController,
    QAPagesController,
    CalendarController,
    ContentController,
    TopicalMapController,
    BrandVisibilityController,
    CompetitorsController,
    KnowledgeBaseController,
    SEOAuditController,
    GSCController,
    AgencyController,
    ImagesController,
  ],
  providers: [],
})
export class AppModule {}
