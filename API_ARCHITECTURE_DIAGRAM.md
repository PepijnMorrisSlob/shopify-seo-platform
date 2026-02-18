# API Integration Architecture

**Shopify SEO Platform - Q&A Content Engine**

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SHOPIFY SEO PLATFORM                              │
│                        Q&A Content Engine                                │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                          CONTENT WORKFLOW                                │
└─────────────────────────────────────────────────────────────────────────┘

   ┌─────────────┐
   │   User      │
   │  Keyword    │
   └──────┬──────┘
          │
          ▼
┌─────────────────────┐
│ 1. QUESTION         │
│    DISCOVERY        │
│                     │
│  DataForSEO API     │
│  ───────────────    │
│  ✓ People Also Ask  │
│  ✓ Related Searches │
│  ✓ Competitor Gaps  │
│                     │
│  Cost: $0.30/query  │
└──────────┬──────────┘
           │
           │ 5-10 questions
           ▼
┌─────────────────────┐
│ 2. RESEARCH         │
│    & VERIFY         │
│                     │
│  Perplexity API     │
│  ───────────────    │
│  ✓ Research Q       │
│  ✓ Get Citations    │
│  ✓ Verify Claims    │
│  ✓ Find Sources     │
│                     │
│  Cost: $0.002/query │
└──────────┬──────────┘
           │
           │ Answer + Citations
           ▼
┌─────────────────────┐
│ 3. CONTENT          │
│    GENERATION       │
│                     │
│  Claude Sonnet 4    │
│  ───────────────    │
│  ✓ Brand Voice      │
│  ✓ SEO Optimization │
│  ✓ Schema Markup    │
│  ✓ Internal Links   │
│                     │
│  (Existing Service) │
└──────────┬──────────┘
           │
           │ HTML Content
           ▼
┌─────────────────────┐
│ 4. PUBLISH          │
│                     │
│  Shopify APIs       │
│  ───────────────    │
│  ✓ Blog Posts       │
│  ✓ Pages            │
│  ✓ Metafields       │
│  ✓ Schema Injection │
│                     │
│  Cost: FREE         │
└──────────┬──────────┘
           │
           │ Published URL
           ▼
┌─────────────────────┐
│ 5. TRACK            │
│    PERFORMANCE      │
│                     │
│  Google Search      │
│  Console API        │
│  ───────────────    │
│  ✓ Rankings         │
│  ✓ Traffic          │
│  ✓ CTR              │
│  ✓ Impressions      │
│                     │
│  (Existing Service) │
└─────────────────────┘
```

---

## Service Dependencies

```
┌───────────────────────────────────────────────────────────────┐
│                    API INTEGRATION LAYER                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐  │
│  │  DataForSEO     │  │  Perplexity     │  │  Shopify     │  │
│  │  Service        │  │  Service        │  │  Services    │  │
│  │                 │  │                 │  │              │  │
│  │  • getPAA()     │  │  • research()   │  │  • Blog API  │  │
│  │  • getRelated() │  │  • verify()     │  │  • Pages API │  │
│  │  • competitor() │  │  • getRecent()  │  │  • Metafields│  │
│  │                 │  │                 │  │              │  │
│  │  $0.30/SERP     │  │  $0.002/query   │  │  FREE        │  │
│  └─────────────────┘  └─────────────────┘  └──────────────┘  │
│           │                    │                    │          │
└───────────┼────────────────────┼────────────────────┼─────────┘
            │                    │                    │
            ▼                    ▼                    ▼
┌───────────────────────────────────────────────────────────────┐
│                     BUSINESS LOGIC LAYER                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Question Discovery Service                           │    │
│  │  • Discover PAA questions                             │    │
│  │  • Filter by relevance                                │    │
│  │  • Prioritize by search volume                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                             │                                  │
│                             ▼                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Content Generation Workflow                          │    │
│  │  • Research question (Perplexity)                     │    │
│  │  • Generate content (Claude)                          │    │
│  │  • Add schema markup                                  │    │
│  │  • Optimize for SEO                                   │    │
│  └──────────────────────────────────────────────────────┘    │
│                             │                                  │
│                             ▼                                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Publishing Service                                   │    │
│  │  • Create blog post/page                              │    │
│  │  • Inject metafields                                  │    │
│  │  • Track internal links                               │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────────────────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────────────────────────┐
│                        DATA LAYER                              │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  PostgreSQL Database (Prisma ORM)                              │
│  ──────────────────────────────                                │
│  • Organizations                                               │
│  • Business Profiles                                           │
│  • Custom Question Templates                                   │
│  • Q&A Pages                                                   │
│  • Internal Links                                              │
│  • Content Performance                                         │
│  • API Cost Tracking                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Example

### Generate 1 Q&A Blog Post

```
Step 1: Question Discovery
───────────────────────────
Input:  keyword = "coffee brewing methods"

API:    DataForSEO.getPeopleAlsoAsk("coffee brewing methods")

Output: [
          "What is the best method for brewing coffee?",
          "How do you make French press coffee?",
          "What's the difference between drip and pour-over?",
          ... (7 more questions)
        ]

Cost:   $0.30


Step 2: Research Question
──────────────────────────
Input:  question = "What is the best method for brewing coffee?"

API:    Perplexity.research(question, { depth: 'thorough' })

Output: {
          answer: "The best method depends on taste preferences...",
          citations: [
            { url: "nytimes.com/coffee-guide", ... },
            { url: "seriouseats.com/brewing", ... }
          ],
          relatedQuestions: [...],
          usage: { totalTokens: 2000 }
        }

Cost:   $0.002


Step 3: Generate Content
─────────────────────────
Input:  question, research.answer, research.citations

Service: AIContentService (Claude Sonnet 4)

Output: {
          content: "<h1>What is the best...</h1><p>...</p>",
          schema: { "@type": "FAQPage", ... },
          seoScore: 92,
          wordCount: 1200
        }

Cost:   (Included in existing Claude API costs)


Step 4: Publish to Shopify
───────────────────────────
Input:  content, schema

API:    ShopifyBlog.createBlogPost(blogId, {
          title: question,
          bodyHtml: content,
          metafields: [schema]
        })

Output: {
          id: "gid://shopify/Article/123",
          handle: "what-is-the-best-method-for-brewing-coffee",
          url: "https://shop.myshopify.com/blogs/news/..."
        }

Cost:   FREE


TOTAL COST PER Q&A POST: $0.302
```

---

## Cost Breakdown

### Per Q&A Post

| Service | Operation | Cost |
|---------|-----------|------|
| DataForSEO | Get PAA questions | $0.30 |
| Perplexity | Research answer | $0.002 |
| Claude Sonnet 4 | Generate content | (variable) |
| Shopify | Publish blog post | FREE |
| **TOTAL** | | **~$0.30** |

### Monthly Cost Estimates

| Posts/Month | DataForSEO | Perplexity | Total |
|-------------|------------|------------|-------|
| 10 | $3.00 | $0.02 | $3.02 |
| 50 | $15.00 | $0.10 | $15.10 |
| 100 | $30.00 | $0.20 | $30.20 |
| 200 | $60.00 | $0.40 | $60.40 |

**Optimization:**
- Cache PAA questions → Reduce DataForSEO calls
- Use `sonar` model for simple queries → 5× cheaper Perplexity
- Batch operations → Fewer API calls

---

## Error Handling Flow

```
┌────────────────┐
│  API Request   │
└───────┬────────┘
        │
        ▼
   ┌─────────┐
   │ Try API │
   └────┬────┘
        │
        ├──[Success]──────────► Return Result
        │
        ├──[429 Rate Limit]───► Wait & Retry (exponential backoff)
        │
        ├──[401/403 Auth]─────► AuthenticationError → Notify User
        │
        ├──[500/502/503]──────► Retry up to 3 times
        │
        └──[Circuit Open]─────► CircuitBreakerError → Pause requests
```

### Retry Logic

- **Max Attempts:** 3
- **Initial Delay:** 1-2 seconds
- **Backoff:** Exponential (2x multiplier)
- **Max Delay:** 30 seconds
- **Circuit Breaker:** Opens after 5 consecutive failures

---

## Type Safety

All services have full TypeScript coverage:

```typescript
// Example: Type-safe API calls

import {
  createDataForSEOClient,
  createPerplexityService,
  createShopifyBlogService,
  DataForSEOPAAQuestion,
  PerplexityResearchResult,
  ShopifyBlogPost,
} from './services';

const dataForSEO = createDataForSEOClient({ ... });
const perplexity = createPerplexityService({ ... });
const blog = createShopifyBlogService({ ... });

// TypeScript knows exact return types
const paa: DataForSEOPAAQuestion[] = await dataForSEO.getPeopleAlsoAsk('keyword');
const research: PerplexityResearchResult = await perplexity.research('question');
const post: ShopifyBlogPost = await blog.createBlogPost(blogId, { ... });

// Autocomplete works everywhere
research.citations.forEach(c => console.log(c.url));
```

---

## Production Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        AWS ECS CLUSTER                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐  ┌──────────────────┐                 │
│  │  API Service     │  │  Worker Service  │                 │
│  │  ────────────    │  │  ──────────────  │                 │
│  │  • REST API      │  │  • Bull Queue    │                 │
│  │  • GraphQL       │  │  • Background    │                 │
│  │  • WebSockets    │  │    Jobs          │                 │
│  │                  │  │  • Scheduled     │                 │
│  │  Replicas: 3     │  │    Tasks         │                 │
│  └──────────────────┘  │                  │                 │
│                        │  Replicas: 2     │                 │
│                        └──────────────────┘                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌──────────────────────────────────────────────────────────────┐
│                    EXTERNAL APIS                              │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  DataForSEO      Perplexity      Shopify      Google         │
│  ──────────      ──────────      ───────      ──────         │
│  • SERP Data     • Research      • Blog       • Search       │
│  • Keywords      • Verify        • Pages      • Console      │
│  • Competitor    • Citations     • Products   • Analytics    │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Monitoring & Observability

### Cost Tracking
```typescript
import { costTracker } from './utils/api-cost-tracker';

// Track costs in real-time
costTracker.trackDataForSEO('getPAA', 0.30, orgId);
costTracker.trackPerplexity('research', 0.002, orgId);

// Monthly summary
const summary = costTracker.getOrganizationCostSummary(orgId);
console.log(`Total: $${summary.totalCost}`);

// Alerts
if (costTracker.isCostLimitExceeded('dataforseo', orgId)) {
  sendAlert('DataForSEO monthly limit exceeded');
}
```

### Health Checks
```typescript
// Circuit breaker stats
const stats = dataForSEO.getCircuitBreakerStats();
if (stats.state === 'OPEN') {
  sendAlert('DataForSEO circuit breaker opened');
}
```

---

## Next Steps

### Immediate (Week 1-2)
- [ ] Deploy services to staging
- [ ] Test with real API credentials
- [ ] Set up cost monitoring alerts
- [ ] Create admin dashboard for cost tracking

### Short-term (Week 3-4)
- [ ] Build Question Discovery UI
- [ ] Implement Content Generation Workflow
- [ ] Add batch processing (50+ posts)
- [ ] Set up automated testing

### Long-term (Month 2-3)
- [ ] A/B testing for titles
- [ ] Auto-optimization for underperforming posts
- [ ] Multi-language support
- [ ] Fine-tuned AI models per industry

---

**Status:** ✅ Architecture Complete & Production-Ready
**Last Updated:** 2026-01-19
