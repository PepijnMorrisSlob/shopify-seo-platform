# Q&A Workflow System - Quick Start Guide

Get the automated Q&A content generation system up and running in 5 minutes.

---

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- OpenAI API key
- Anthropic API key
- Perplexity API key
- Shopify store credentials

---

## 1. Environment Setup

Add these to your `.env` file:

```bash
# AI APIs
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/shopify_seo

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Shopify (per organization)
SHOPIFY_DOMAIN=your-store.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_...
```

---

## 2. Install Dependencies

```bash
cd backend
npm install

# Install additional dependencies for workflows
npm install bullmq cron
```

---

## 3. Database Migration

```bash
# Run migrations (creates new tables)
npx prisma migrate dev --name add_qa_content_engine

# Generate Prisma Client
npx prisma generate
```

---

## 4. Start Redis

```bash
# Using Docker
docker run -d -p 6379:6379 redis:6-alpine

# Or using local Redis
redis-server
```

---

## 5. Start Queue Workers

```bash
# Development
npm run queue:dev

# Production (with PM2)
pm2 start dist/queues/workers/index.js --name queue-workers
```

**You should see:**
```
[QueueWorkers] Starting queue workers...
Content Generation Worker: 10 concurrent, 100/min limit
Publishing Worker: 5 concurrent, 50/min limit
Webhook Processing Worker: 20 concurrent, 1000/min limit
Optimization Worker: 2 concurrent, 10/min limit
Batch Processing Worker: 1 concurrent, 5/hour limit
Queue workers are running. Press Ctrl+C to stop.
```

---

## 6. Start Cron Jobs

```bash
# Development
npm run cron:dev

# Production (with PM2)
pm2 start dist/cron/index.js --name cron-jobs
```

**You should see:**
```
[DailyOptimizationJob] Scheduled to run daily at 2 AM UTC
[WeeklyLinkingJob] Scheduled to run weekly on Sundays at 3 AM UTC
Cron scheduler is running. Press Ctrl+C to stop.
```

---

## 7. Test the System

### Generate a Single Q&A Page

```typescript
import { PrismaClient } from '@prisma/client';
import { ContentGenerationWorkflow } from './workflows';

const prisma = new PrismaClient();
const workflow = new ContentGenerationWorkflow(prisma);

async function test() {
  const result = await workflow.execute({
    questionId: 'test-1',
    organizationId: 'your-org-id',
    question: 'How to brew the perfect espresso?',
    targetKeyword: 'perfect espresso',
  });

  console.log('Result:', result);
  // Expected: { success: true, qaPageId: '...', seoScore: 85-95, status: 'published' }
}

test();
```

### Generate a Batch of Questions

```typescript
import { BatchProcessingWorkflow } from './workflows';

const workflow = new BatchProcessingWorkflow(prisma);

async function testBatch() {
  const result = await workflow.execute({
    organizationId: 'your-org-id',
    questions: [
      { id: 'q1', question: 'How to make cold brew coffee?', priority: 9 },
      { id: 'q2', question: 'Best espresso beans for beginners?', priority: 7 },
      { id: 'q3', question: 'How to clean an espresso machine?', priority: 5 },
    ],
    concurrency: 3,
  });

  console.log('Batch Result:', result);
  // Expected: { success: true, totalQuestions: 3, completed: 3, failed: 0 }
}

testBatch();
```

### Optimize Existing Pages

```typescript
import { AutoOptimizationWorkflow } from './workflows';

const workflow = new AutoOptimizationWorkflow(prisma);

async function testOptimization() {
  const result = await workflow.execute({
    organizationId: 'your-org-id',
  });

  console.log('Optimization Result:', result);
  // Expected: { success: true, pagesAnalyzed: 10, pagesOptimized: 2 }
}

testOptimization();
```

### Optimize Internal Links

```typescript
import { InternalLinkingWorkflow } from './workflows';

const workflow = new InternalLinkingWorkflow(prisma);

async function testLinking() {
  const result = await workflow.execute({
    organizationId: 'your-org-id',
    targetInboundLinks: 3,
    maxLinksPerUpdate: 50,
  });

  console.log('Linking Result:', result);
  // Expected: { success: true, orphanPagesFixed: 5, totalLinksAdded: 25 }
}

testLinking();
```

---

## 8. Monitor Queues

### Using Redis CLI

```bash
redis-cli

# Check queue lengths
> LLEN bull:content-generation:wait
> LLEN bull:optimization:wait
> LLEN bull:batch-processing:wait

# View active jobs
> KEYS bull:content-generation:*
```

### Using BullMQ Dashboard (Optional)

```bash
npm install -g bull-board
bull-board
# Open http://localhost:3000
```

---

## 9. Manual Cron Job Execution

```bash
# Run daily optimization immediately (for testing)
node dist/cron/daily-optimization-job.js --now

# Run weekly linking immediately
node dist/cron/weekly-linking-job.js --now
```

---

## 10. Check Shopify Integration

After running a workflow, check your Shopify store:

1. Go to **Content** → **Blog posts**
2. Look for newly created posts tagged with `qa` and `seo`
3. Verify schema markup in blog post metafields
4. Check internal links in post content

---

## Common Issues & Solutions

### Issue: "Connection refused" for Redis
**Solution:**
```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start Redis
docker run -d -p 6379:6379 redis:6-alpine
```

### Issue: "API key not found"
**Solution:**
```bash
# Verify .env file
cat .env | grep API_KEY

# Restart workers to pick up new env vars
pm2 restart queue-workers
```

### Issue: "Database connection failed"
**Solution:**
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Test connection
npx prisma db push
```

### Issue: "Queue workers not processing jobs"
**Solution:**
```bash
# Check worker logs
pm2 logs queue-workers

# Restart workers
pm2 restart queue-workers

# Check Redis connection
redis-cli ping
```

---

## Production Deployment Checklist

- [ ] Environment variables set correctly
- [ ] Database migrations run
- [ ] Redis server running and accessible
- [ ] Queue workers started with PM2
- [ ] Cron jobs started with PM2
- [ ] Monitoring setup (PM2 logs, error tracking)
- [ ] Shopify credentials configured per organization
- [ ] API rate limits configured
- [ ] Error alerting configured
- [ ] Backup cron job logs configured

---

## Monitoring Commands

```bash
# PM2 status
pm2 status

# Queue worker logs
pm2 logs queue-workers --lines 100

# Cron job logs
pm2 logs cron-jobs --lines 100

# Redis info
redis-cli info

# Database connections
psql -c "SELECT count(*) FROM pg_stat_activity;"

# Queue stats (from app)
curl http://localhost:3000/api/queues/stats
```

---

## Performance Tuning

### Increase Worker Concurrency

Edit `backend/src/queues/workers/optimization-worker.ts`:

```typescript
const worker = new Worker('optimization', processJob, {
  connection: getRedisConnection(),
  concurrency: 5, // Increase from 2 to 5
});
```

### Adjust Batch Size

```typescript
const result = await workflow.execute({
  organizationId: 'org123',
  questions: [...],
  concurrency: 10, // Increase from 5 to 10
});
```

### Tune Redis

```bash
# Edit redis.conf
maxmemory 2gb
maxmemory-policy allkeys-lru
```

---

## Cost Monitoring

Track AI API usage:

```typescript
import { AIContentService } from './services';

const aiService = new AIContentService();
const costSummary = aiService.getCostSummary('org123', 'daily');

console.log(costSummary);
// {
//   organizationId: 'org123',
//   period: 'daily',
//   totalCost: 4.50,
//   totalTokens: 125000,
//   breakdown: [
//     { model: 'claude-sonnet-4', requests: 20, tokens: 80000, cost: 3.50 },
//     { model: 'gpt-4-turbo', requests: 10, tokens: 45000, cost: 1.00 }
//   ]
// }
```

---

## Next Steps

1. **Integrate with Frontend** - Build UI for workflow management
2. **Add More Question Sources** - PAA, competitor analysis, keyword research
3. **Enhance Optimization** - A/B testing, performance predictions
4. **Scale Workers** - Add more workers for high-volume organizations
5. **Add Monitoring** - Datadog, New Relic, or custom dashboards

---

## Support

- **Documentation:** `backend/src/workflows/README.md`
- **Implementation Summary:** `WORKFLOW_IMPLEMENTATION_SUMMARY.md`
- **Codebase:** `backend/src/workflows/`, `backend/src/queues/`, `backend/src/cron/`

---

**System Status:** ✅ Ready for Production

**Average Setup Time:** 5-10 minutes

**First Q&A Page Generated:** ~30 seconds after first workflow execution
