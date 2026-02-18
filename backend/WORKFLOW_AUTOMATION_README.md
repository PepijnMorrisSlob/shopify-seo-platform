# Shopify SEO Platform - Workflow Automation Services

Production-ready automation engine for content publishing, scheduling, and webhook processing.

## Architecture Overview

### Core Components

1. **Publishing Service** (`publishing-service.ts`)
   - Single product publishing
   - Bulk publishing (queued)
   - Schema markup generation (Product, FAQ, BreadcrumbList)
   - Internal linking automation
   - Quality validation (meta title/description)
   - Audit trail logging

2. **Content Calendar Service** (`content-calendar-service.ts`)
   - Schedule content for future publishing
   - View upcoming scheduled content
   - Cancel/reschedule operations
   - Automatic publishing via delayed jobs
   - Timezone support

3. **Bulk Operations Service** (`bulk-operations-service.ts`)
   - Process 100+ products simultaneously
   - Real-time progress tracking
   - Pause/resume capability
   - Error handling (continue on failure)
   - Detailed error reporting

4. **Webhook Processor Service** (`webhook-processor-service.ts`)
   - Idempotent webhook processing
   - FIFO processing from SQS
   - Handles: products/create, products/update, products/delete, app/uninstalled
   - Retry logic (3 attempts)
   - Dead Letter Queue (DLQ) for failed webhooks

### Queue Infrastructure (BullMQ)

#### Content Generation Queue
- **Purpose:** AI-powered content generation
- **Concurrency:** 10 workers
- **Rate Limit:** 100 jobs/minute
- **Retry:** 3 attempts (exponential backoff: 2s, 4s, 8s)
- **Retention:** 24h completed, 7d failed

#### Publishing Queue
- **Purpose:** Publish SEO content to Shopify
- **Concurrency:** 5 workers (critical operation)
- **Rate Limit:** 50 jobs/minute (Shopify API limits)
- **Retry:** 5 attempts (exponential backoff: 3s, 6s, 12s, 24s, 48s)
- **Retention:** 24h completed, 7d failed
- **Alerts:** Critical failures after 5 attempts

#### Webhook Processing Queue
- **Purpose:** Process Shopify webhooks
- **Concurrency:** 20 workers (high throughput)
- **Rate Limit:** 1000 jobs/minute
- **Retry:** 3 attempts (exponential backoff: 1s, 2s, 4s)
- **Target:** <30s processing time
- **Retention:** 24h completed, 7d failed

## Scale & Performance Targets

### Publishing Service
- **Scale:** 100+ concurrent publishes
- **Target:** <5s publish time
- **Reliability:** 99.9% success rate

### Bulk Operations
- **Scale:** 1,000+ products per operation
- **Target:** <10min for 100 products
- **Progress:** Real-time tracking

### Webhook Processing
- **Scale:** 1,000+ webhooks/minute
- **Target:** <30s processing time
- **Reliability:** 99.99% success rate
- **Idempotency:** 100% (UNIQUE constraint on webhook_id)

## Installation

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Environment Variables

Create `.env` file:

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/shopify_seo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# AWS (for SQS webhooks)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
SQS_WEBHOOK_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123/shopify-webhooks

# Shopify
SHOPIFY_API_KEY=your_api_key
SHOPIFY_API_SECRET=your_api_secret

# Monitoring
SENTRY_DSN=your_sentry_dsn
LOG_LEVEL=info
```

### 3. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or using local Redis
redis-server
```

### 4. Start Queue Workers

Development:
```bash
npm run queue:dev
```

Production:
```bash
npm run build
pm2 start dist/queues/workers/index.js --name queue-workers --instances 4
```

## Usage Examples

### 1. Publish Single Product

```typescript
import { PublishingService } from './services/publishing-service';

const publishingService = new PublishingService();

const result = await publishingService.publishProductMetaTags(
  'product-123',
  'Premium Coffee Beans | Best Arabica Coffee',
  'Buy premium coffee beans online. Ethically sourced Arabica coffee with fast shipping.',
  'org-456'
);

console.log(result);
// { success: true, productId: 'product-123', publishedAt: 2026-01-19T... }
```

### 2. Schedule Content

```typescript
import { ContentCalendarService } from './services/content-calendar-service';

const calendarService = new ContentCalendarService();

const scheduledJob = await calendarService.scheduleContent(
  'product-123',
  {
    metaTitle: 'Premium Coffee Beans | Best Arabica Coffee',
    metaDescription: 'Buy premium coffee beans online...',
    qualityScore: 92,
  },
  new Date('2026-02-01T09:00:00Z'),
  'org-456'
);

console.log(scheduledJob);
// { id: 'sched-789', status: 'scheduled', publishAt: 2026-02-01T09:00:00Z }
```

### 3. Bulk Operations

```typescript
import { BulkOperationsService } from './services/bulk-operations-service';

const bulkOpsService = new BulkOperationsService();

// Generate content for 500 products
const jobId = await bulkOpsService.generateBulkContent(
  ['prod-1', 'prod-2', 'prod-3', /* ...497 more */],
  'gpt-4',
  'org-456'
);

// Check progress
const status = await bulkOpsService.getBulkJobStatus(jobId);
console.log(status);
// {
//   jobId: 'bulk-123',
//   status: 'processing',
//   progress: 45,
//   totalItems: 500,
//   processedItems: 225,
//   successfulItems: 220,
//   failedItems: 5
// }
```

### 4. Process Webhooks

```typescript
import { WebhookProcessorService } from './services/webhook-processor-service';

const webhookProcessor = new WebhookProcessorService();

// Poll SQS queue (called by cron job)
await webhookProcessor.pollWebhookQueue();

// Or process single webhook
const result = await webhookProcessor.processWebhook({
  id: 'webhook-123',
  topic: 'products/update',
  shop_domain: 'mystore.myshopify.com',
  payload: { id: '789', title: 'Updated Product' },
  received_at: new Date(),
});

console.log(result);
// { success: true, webhookId: 'webhook-123', action: 'updated' }
```

## Monitoring & Observability

### Queue Metrics

Monitor via BullMQ Dashboard or Redis CLI:

```bash
# View queue status
redis-cli HGETALL bull:content-generation:meta

# View waiting jobs
redis-cli LRANGE bull:content-generation:wait 0 -1

# View failed jobs
redis-cli LRANGE bull:content-generation:failed 0 -1
```

### Logging

All services use NestJS Logger:

```typescript
// Logs are structured with context
[ContentGenerationWorker] Processing content generation for product prod-123 (Job job-456)
[PublishingService] Successfully published meta tags for product prod-123
[WebhookProcessorService] Processing webhook webhook-789 - Topic: products/update (30ms)
```

### Alerts

#### Critical Alerts (Immediate Action)
- Publishing job permanently failed after 5 attempts
- Webhook DLQ depth >10
- Queue processing time >30s (webhooks)
- Error rate >1% (5-minute window)

#### Warning Alerts (Investigate Within 1 Hour)
- Bulk operation stalled (no progress for 10 minutes)
- Queue depth >1000 items
- Worker crash/restart

## Error Handling & Recovery

### Idempotency

Webhooks are idempotent using database UNIQUE constraint:

```sql
CREATE UNIQUE INDEX webhook_logs_webhook_id_key ON webhook_logs(webhook_id);
```

If a webhook is received twice:
1. First attempt: Insert succeeds, webhook processed
2. Second attempt: Insert fails with unique violation, webhook skipped

### Retry Strategy

| Queue | Attempts | Backoff | DLQ |
|-------|----------|---------|-----|
| Content Generation | 3 | Exponential (2s) | Yes |
| Publishing | 5 | Exponential (3s) | Yes |
| Webhook Processing | 3 | Exponential (1s) | Yes |

### Dead Letter Queue (DLQ)

Failed jobs after max retries are moved to DLQ:

```typescript
// View DLQ jobs
const failedJobs = await publishingQueue.getFailed();

// Retry DLQ job
const job = await publishingQueue.getJob('job-123');
await job.retry();

// Remove DLQ job
await job.remove();
```

## Testing

### Unit Tests

```bash
npm run test
```

### Integration Tests

```bash
# Start test dependencies
docker-compose -f docker-compose.test.yml up -d

# Run integration tests
npm run test:e2e
```

### Load Tests

```bash
# Test webhook processing (1000 webhooks/min)
npm run test:load:webhooks

# Test bulk operations (500 products)
npm run test:load:bulk
```

## Production Deployment

### 1. Docker Deployment

```dockerfile
# Dockerfile for queue workers
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

CMD ["node", "dist/queues/workers/index.js"]
```

### 2. AWS ECS Fargate

```yaml
# task-definition.json
{
  "family": "shopify-seo-workers",
  "containerDefinitions": [
    {
      "name": "queue-workers",
      "image": "shopify-seo-backend:latest",
      "memory": 2048,
      "cpu": 1024,
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "REDIS_HOST", "value": "shopify-seo-redis.cache.amazonaws.com" }
      ]
    }
  ]
}
```

### 3. Horizontal Scaling

Scale workers based on queue depth:

```bash
# Scale to 10 worker instances
pm2 scale queue-workers 10

# Auto-scale based on queue depth
# CloudWatch Alarm: queue depth > 1000 → scale up
# CloudWatch Alarm: queue depth < 100 → scale down
```

## Troubleshooting

### Issue: Jobs Stuck in Queue

**Cause:** Workers not running or Redis connection lost

**Solution:**
```bash
# Check workers are running
pm2 list

# Check Redis connection
redis-cli PING

# Restart workers
pm2 restart queue-workers
```

### Issue: High Memory Usage

**Cause:** Too many concurrent jobs

**Solution:**
```typescript
// Reduce concurrency in worker config
concurrency: 5 // Reduced from 10
```

### Issue: Webhook Processing Timeout

**Cause:** Slow database queries or external API calls

**Solution:**
1. Add database indexes
2. Increase visibility timeout in SQS
3. Optimize webhook handler logic

## File Manifest

### Services (for other agents to import)

```typescript
// Other agents will import:
import { PublishingService } from './services/publishing-service';
import { BulkOperationsService } from './services/bulk-operations-service';
import { ContentCalendarService } from './services/content-calendar-service';
import { WebhookProcessorService } from './services/webhook-processor-service';
```

### Dependencies (expected from other agents)

```typescript
// From API Integration Specialist
import { ShopifyIntegrationService } from './services/shopify-integration-service';

// From Documentation/Architecture Specialist
import { AIContentService } from './services/ai-content-service';

// From Database Specialist
import { Product, ContentGeneration, Organization } from './types/database.types';
```

## Support

For issues or questions:
- Create GitHub issue
- Contact: workflow-automation-team@shopify-seo.com
- Slack: #workflow-automation

---

**Agent:** Workflow/Automation Specialist
**Version:** 1.0.0
**Last Updated:** 2026-01-19
