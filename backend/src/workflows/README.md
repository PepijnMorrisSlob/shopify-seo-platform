# Q&A Content Generation Workflows

Automated workflows for generating, optimizing, and managing Q&A content.

## Overview

This system orchestrates all AI services into complete content pipelines:

1. **Content Generation Workflow** - Question → Research → Content → Links → Schema → Publish
2. **Auto-Optimization Workflow** - Monitor → Detect issues → Optimize → Re-publish
3. **Internal Linking Workflow** - Find orphans → Generate links → Update pages
4. **Batch Processing Workflow** - Process 10-100 questions in parallel

---

## 1. Content Generation Workflow

**Purpose:** Generate a complete Q&A page from a single question.

**Pipeline:**
```
Question Input
    ↓
Perplexity Research (fact-checking)
    ↓
AI Content Generation (Claude + Business Profile)
    ↓
Internal Linking (AI-powered contextual links)
    ↓
Schema Markup (FAQ schema)
    ↓
SEO Validation (score 0-100)
    ↓
Save to Database
    ↓
Publish to Shopify (if score ≥85)
```

**Usage:**
```typescript
import { ContentGenerationWorkflow } from './workflows';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workflow = new ContentGenerationWorkflow(prisma);

const result = await workflow.execute({
  questionId: 'q123',
  organizationId: 'org123',
  question: 'How to brew the perfect espresso?',
  targetKeyword: 'perfect espresso',
  relatedProducts: [
    { id: 'prod1', title: 'Espresso Machine Pro' }
  ]
});

console.log(result);
// {
//   success: true,
//   qaPageId: 'page123',
//   seoScore: 92,
//   status: 'published',
//   shopifyUrl: 'https://example.com/blogs/seo/how-to-brew-perfect-espresso'
// }
```

**Auto-Approval Logic:**
- SEO Score ≥85: Auto-publish to Shopify
- SEO Score 70-84: Pending review (manual approval)
- SEO Score <70: Draft (needs regeneration)

---

## 2. Auto-Optimization Workflow

**Purpose:** Monitor and optimize underperforming content.

**Triggers:**
- Ranking drop >5 positions
- Traffic decline >20%
- Content age >90 days
- SEO score dropped below 70

**Actions:**
1. **Content Refresh** - Update with latest data from Perplexity
2. **Meta Tag Optimization** - Improve CTR with better titles/descriptions
3. **Internal Link Enhancement** - Add more contextual links
4. **Schema Update** - Regenerate schema markup
5. **Shopify Re-publish** - Update blog post

**Usage:**
```typescript
import { AutoOptimizationWorkflow } from './workflows';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workflow = new AutoOptimizationWorkflow(prisma);

// Optimize all pages for an organization
const result = await workflow.execute({
  organizationId: 'org123'
});

console.log(result);
// {
//   success: true,
//   pagesAnalyzed: 45,
//   pagesOptimized: 8,
//   optimizations: [
//     {
//       pageId: 'page1',
//       question: 'Best coffee beans for espresso',
//       issuesFound: ['ranking_decline', 'outdated_content'],
//       actionsToken: ['Refreshed content', 'Added 2 internal links'],
//       newSeoScore: 88
//     }
//   ]
// }

// Optimize specific page
const result2 = await workflow.execute({
  organizationId: 'org123',
  pageId: 'page123',
  forceOptimize: true
});
```

**Scheduled Execution:**
- Daily at 2 AM UTC (via cron job)
- Automatic for all organizations

---

## 3. Internal Linking Workflow

**Purpose:** Optimize link graph for SEO and user experience.

**Goals:**
- Eliminate orphan pages (0 inbound links)
- Ensure all pages have 3-5 inbound links
- Create hub pages (high-traffic pages that link out)
- Use AI-generated contextual anchor text

**Usage:**
```typescript
import { InternalLinkingWorkflow } from './workflows';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workflow = new InternalLinkingWorkflow(prisma);

const result = await workflow.execute({
  organizationId: 'org123',
  targetInboundLinks: 3, // Ensure each page has at least 3 inbound links
  maxLinksPerUpdate: 50  // Add max 50 links per run
});

console.log(result);
// {
//   success: true,
//   orphanPagesFound: 12,
//   orphanPagesFixed: 12,
//   underlinkedPagesFound: 23,
//   underlinkedPagesFixed: 18,
//   totalLinksAdded: 47,
//   pagesUpdated: 35,
//   linkGraphMetrics: {
//     totalPages: 120,
//     totalLinks: 380,
//     averageInboundLinks: 3.2,
//     averageOutboundLinks: 3.2,
//     orphanPages: 0
//   }
// }
```

**Scheduled Execution:**
- Weekly on Sundays at 3 AM UTC (via cron job)

---

## 4. Batch Processing Workflow

**Purpose:** Generate 10-100 Q&A pages in one batch.

**Use Cases:**
- Initial content seeding for new clients
- Bulk generation from keyword lists
- Competitor content gap filling
- Seasonal campaigns

**Features:**
- Priority queue (process high-priority questions first)
- Concurrent processing (up to 5 at once)
- Progress tracking
- Error handling (continue on failure)
- Automatic retries

**Usage:**
```typescript
import { BatchProcessingWorkflow } from './workflows';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const workflow = new BatchProcessingWorkflow(prisma);

const result = await workflow.execute({
  organizationId: 'org123',
  questions: [
    {
      id: 'q1',
      question: 'How to make cold brew coffee?',
      priority: 9, // 1-10, higher = more important
      targetKeyword: 'cold brew coffee'
    },
    {
      id: 'q2',
      question: 'Best espresso beans for beginners',
      priority: 7
    },
    // ... up to 100 questions
  ],
  concurrency: 5, // Process 5 at once
  skipPublishing: false, // Auto-publish if SEO score ≥85
  retryFailures: true // Retry failed items
});

console.log(result);
// {
//   success: true,
//   totalQuestions: 50,
//   completed: 47,
//   failed: 3,
//   pending: 0,
//   results: [
//     { questionId: 'q1', status: 'completed', qaPageId: 'page1', seoScore: 91 },
//     { questionId: 'q2', status: 'completed', qaPageId: 'page2', seoScore: 88 },
//     { questionId: 'q3', status: 'failed', error: 'Rate limit exceeded' }
//   ]
// }
```

**Time Estimation:**
```typescript
const estimate = workflow.estimateProcessingTime(50, 5);
console.log(estimate);
// {
//   estimatedMinutes: 5,
//   estimatedCost: 4.00
// }
```

**Background Processing:**
```typescript
// Add to queue for background processing
const job = await workflow.addToQueue({
  organizationId: 'org123',
  questions: [...],
  concurrency: 5
});

console.log(`Job queued: ${job.jobId}`);

// Check progress
const progress = await workflow.getProgress(job.jobId);
console.log(progress);
// {
//   status: 'active',
//   progress: 60,
//   completed: 30,
//   total: 50
// }
```

---

## Queue Workers

All workflows use BullMQ queues for scalable background processing.

**Running Workers:**
```bash
# Development
npm run queue:dev

# Production (with PM2)
pm2 start dist/queues/workers/index.js --name queue-workers
```

**Active Workers:**
1. **Content Generation Worker** - 10 concurrent, 100/min limit
2. **Publishing Worker** - 5 concurrent, 50/min limit
3. **Webhook Processing Worker** - 20 concurrent, 1000/min limit
4. **Optimization Worker** - 2 concurrent, 10/min limit
5. **Batch Processing Worker** - 1 concurrent, 5/hour limit

---

## Cron Jobs

Scheduled tasks that run automatically.

**Running Cron Jobs:**
```bash
# Development
npm run cron:dev

# Production (with PM2)
pm2 start dist/cron/index.js --name cron-jobs
```

**Active Cron Jobs:**
1. **Daily Optimization** - Every day at 2 AM UTC
   - Scans all published pages
   - Optimizes underperformers
   - Queues optimization jobs

2. **Weekly Linking** - Every Sunday at 3 AM UTC
   - Optimizes link graph
   - Fixes orphan pages
   - Balances link distribution

**Manual Execution:**
```bash
# Run daily optimization now
node dist/cron/daily-optimization-job.js --now

# Run weekly linking now
node dist/cron/weekly-linking-job.js --now
```

---

## Service Integration

Workflows orchestrate these services:

**AI Services:**
- `AIContentService` - Multi-model content generation (GPT-4, Claude, Perplexity)
- `PerplexityService` - Research and fact-checking
- `AdvancedInternalLinkingService` - AI-powered contextual linking
- `SchemaService` - Schema.org markup generation
- `SEOValidatorService` - SEO compliance validation
- `AutoOptimizationService` - Performance monitoring and optimization

**API Services:**
- `ShopifyBlogService` - Shopify blog API integration
- `ShopifyPagesService` - Shopify pages API integration
- `DataForSEOService` - People Also Ask, related searches

**Repositories:**
- `BusinessProfileRepository` - Business customization data
- `QAPageRepository` - Q&A content pages
- `InternalLinkRepository` - Link graph

---

## Error Handling

All workflows include comprehensive error handling:

**Retry Logic:**
- Content Generation: 3 attempts with exponential backoff
- Optimization: 2 attempts
- Batch Processing: 3 attempts per question

**Failure Modes:**
- **API Rate Limits** - Automatic retry with backoff
- **AI Model Failures** - Fallback to alternative models
- **Database Errors** - Transaction rollback
- **Shopify API Errors** - Save content, skip publishing

**Monitoring:**
```typescript
// All workflows return detailed results
const result = await workflow.execute(input);

if (!result.success) {
  console.error('Workflow failed:', result.error);
  // Send alert, log to monitoring system
}
```

---

## Cost Tracking

AI usage costs are tracked per organization:

**Per Question Costs:**
- Perplexity Research: ~$0.01
- Claude Content Generation: ~$0.05
- OpenAI Embeddings (linking): ~$0.02
- **Total: ~$0.08 per question**

**Batch Cost Estimation:**
```typescript
const workflow = new BatchProcessingWorkflow(prisma);
const estimate = workflow.estimateProcessingTime(100, 5);

console.log(`100 questions will cost ~$${estimate.estimatedCost}`);
// "100 questions will cost ~$8.00"
```

---

## Best Practices

1. **Use Batch Processing for bulk operations** - More efficient than individual requests
2. **Monitor queue depth** - Scale workers if queue grows
3. **Set appropriate priority levels** - High-priority questions processed first
4. **Enable retry for important batches** - Ensures maximum completion rate
5. **Schedule optimization during off-hours** - Avoid peak traffic times
6. **Review pending_review content** - Approve pages with 70-84 SEO scores

---

## File Structure

```
backend/src/
├── workflows/
│   ├── content-generation-workflow.ts (Complete pipeline)
│   ├── auto-optimization-workflow.ts (Performance monitoring)
│   ├── internal-linking-workflow.ts (Link graph optimization)
│   ├── batch-processing-workflow.ts (Bulk generation)
│   └── index.ts (Exports)
│
├── queues/
│   ├── workers/
│   │   ├── optimization-worker.ts (NEW)
│   │   ├── batch-processing-worker.ts (NEW)
│   │   └── index.ts (Updated)
│   └── optimization-queue.ts (NEW)
│
└── cron/
    ├── daily-optimization-job.ts (NEW)
    ├── weekly-linking-job.ts (NEW)
    └── index.ts (NEW)
```

---

## Next Steps

1. **Deploy workers** - `pm2 start workers`
2. **Deploy cron jobs** - `pm2 start cron`
3. **Monitor queues** - BullMQ Dashboard or Redis CLI
4. **Test workflows** - Run manual batches
5. **Review optimization results** - Check daily reports

---

**Questions?** See main project documentation or contact the development team.
