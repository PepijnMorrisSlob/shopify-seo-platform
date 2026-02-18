# API Integration Guide
**Date:** 2026-01-19
**Version:** 2.0 - Q&A Content Engine

---

## Overview

This guide covers all API integrations for the Shopify SEO Platform's Q&A Content Engine:

1. **Shopify Blog API** - Publish blog posts with schema markup
2. **Shopify Pages API** - Create landing/resource pages
3. **DataForSEO** - Question discovery (People Also Ask)
4. **Perplexity AI** - Research and fact-checking
5. **Google Search Console** - Performance tracking
6. **SEMrush** - Competitor analysis

---

## 1. Shopify Blog API

### Service: `ShopifyBlogService`

Manages Shopify blog posts via REST Admin API 2026-01.

### Features
- ✅ Create blog posts with full HTML content
- ✅ Update existing posts
- ✅ Get all posts with filtering
- ✅ Delete posts
- ✅ Add metafields (schema markup)
- ✅ Automatic slug generation
- ✅ Rate limit handling

### Setup

```typescript
import { createShopifyBlogService } from './services';

const blogService = createShopifyBlogService({
  shopDomain: 'your-shop.myshopify.com',
  accessToken: 'your_access_token',
});
```

### Usage Examples

#### Create a Blog Post

```typescript
// Get default blog
const blog = await blogService.getDefaultBlog();

// Create post with FAQ schema
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'What is the best coffee brewing method?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'The best method depends on your taste preferences...',
      },
    },
  ],
};

const post = await blogService.createBlogPost(blog.id, {
  title: 'What is the Best Coffee Brewing Method?',
  bodyHtml: '<h2>Introduction</h2><p>Coffee brewing methods...</p>',
  author: 'Coffee Expert',
  tags: ['coffee', 'brewing', 'qa'],
  published: true,
  metafields: [
    {
      namespace: 'schema',
      key: 'faq',
      value: JSON.stringify(faqSchema),
      type: 'json_string',
    },
  ],
});

console.log(`Published: ${post.id}`);
// URL: https://your-shop.myshopify.com/blogs/news/what-is-the-best-coffee-brewing-method
```

#### Update a Blog Post

```typescript
const updatedPost = await blogService.updateBlogPost(blog.id, post.id, {
  bodyHtml: '<h2>Updated Content</h2><p>New information...</p>',
  tags: ['coffee', 'brewing', 'qa', 'updated'],
});
```

#### Get All Blog Posts

```typescript
const allPosts = await blogService.getBlogPosts(blog.id, {
  status: 'published',
  limit: 250,
  tags: 'qa',
});

console.log(`Found ${allPosts.length} Q&A posts`);
```

#### Delete a Blog Post

```typescript
await blogService.deleteBlogPost(blog.id, post.id);
```

---

## 2. Shopify Pages API

### Service: `ShopifyPagesService`

Manages Shopify pages (landing pages, resource pages) via REST Admin API.

### Features
- ✅ Create pages with full HTML
- ✅ Update existing pages
- ✅ Get all pages
- ✅ Delete pages
- ✅ Add metafields (HowTo schema, Article schema)
- ✅ Automatic slug generation

### Setup

```typescript
import { createShopifyPagesService } from './services';

const pagesService = createShopifyPagesService({
  shopDomain: 'your-shop.myshopify.com',
  accessToken: 'your_access_token',
});
```

### Usage Examples

#### Create a Page with HowTo Schema

```typescript
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to Brew Coffee with a French Press',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Heat water',
      text: 'Heat water to 200°F (93°C)',
    },
    {
      '@type': 'HowToStep',
      name: 'Add coffee',
      text: 'Add coarsely ground coffee (1:15 ratio)',
    },
  ],
};

const page = await pagesService.createPage({
  title: 'How to Brew Coffee with a French Press',
  bodyHtml: `
    <h1>How to Brew Coffee with a French Press</h1>
    <ol>
      <li>Heat water to 200°F</li>
      <li>Add coffee (1:15 ratio)</li>
      <li>Steep for 4 minutes</li>
      <li>Press and serve</li>
    </ol>
  `,
  published: true,
  metafields: [
    {
      namespace: 'schema',
      key: 'how_to',
      value: JSON.stringify(howToSchema),
      type: 'json_string',
    },
  ],
});

console.log(`Published: ${page.id}`);
// URL: https://your-shop.myshopify.com/pages/how-to-brew-coffee-with-a-french-press
```

#### Get All Pages

```typescript
const pages = await pagesService.getAllPages();
console.log(`Total pages: ${pages.length}`);
```

#### Get Page by Handle (Slug)

```typescript
const page = await pagesService.getPageByHandle('how-to-brew-coffee-with-a-french-press');
```

---

## 3. DataForSEO - Question Discovery

### Service: `DataForSEOService`

Enhanced with **People Also Ask** (PAA) and competitor analysis.

### New Features for Q&A Engine
- ✅ Get "People Also Ask" questions from Google SERP
- ✅ Get related searches
- ✅ Batch PAA discovery
- ✅ Competitor content analysis

### Setup

```typescript
import { createDataForSEOClient } from './services';

const dataForSEO = createDataForSEOClient({
  login: 'your_email@example.com',
  password: 'your_password',
});
```

### Usage Examples

#### Get People Also Ask Questions

```typescript
const paaQuestions = await dataForSEO.getPeopleAlsoAsk('coffee brewing methods');

console.log(`Found ${paaQuestions.length} PAA questions:`);

paaQuestions.forEach((q, i) => {
  console.log(`${i + 1}. ${q.question}`);
  console.log(`   Answer: ${q.answer?.substring(0, 100)}...`);
  console.log(`   URL: ${q.url}`);
});

// Output:
// 1. What is the best method for brewing coffee?
//    Answer: The best method depends on your taste preferences...
//    URL: https://example.com/coffee-guide
```

#### Batch Get PAA for Multiple Keywords

```typescript
const keywords = ['coffee brewing', 'espresso vs drip', 'cold brew coffee'];

const paaResults = await dataForSEO.batchGetPeopleAlsoAsk(keywords);

paaResults.forEach((questions, keyword) => {
  console.log(`\n${keyword}: ${questions.length} questions`);
  questions.slice(0, 3).forEach((q) => console.log(`  - ${q.question}`));
});
```

#### Get Related Searches

```typescript
const relatedSearches = await dataForSEO.getRelatedSearches('coffee brewing methods');

console.log('Related searches:');
relatedSearches.forEach((s) => {
  console.log(`- ${s.keyword}`);
});
```

#### Analyze Competitor Content

```typescript
const competitor = await dataForSEO.getCompetitorContent('bluebottlecoffee.com');

console.log(`Competitor Analysis:`);
console.log(`- Total Keywords: ${competitor.totalKeywords}`);
console.log(`- Total Traffic: ${competitor.totalTraffic}`);
console.log(`- Content Types: ${competitor.contentTypes.join(', ')}`);
console.log(`\nTop Pages:`);
competitor.topPages.slice(0, 5).forEach((page) => {
  console.log(`  - ${page.title} (${page.traffic} traffic)`);
});
```

### API Costs

| Operation | Cost |
|-----------|------|
| SERP Data (for PAA) | $0.30 per request |
| Keyword Data | $0.15 per 100 keywords |
| Domain Analysis | $0.50 per request |

**Pro Tip:** Batch PAA requests to minimize costs (1 SERP request can yield 5-10 questions).

---

## 4. Perplexity AI - Research & Fact-Checking

### Service: `PerplexityService`

AI-powered research with citations for factual Q&A content.

### Features
- ✅ Research questions with authoritative sources
- ✅ Verify claims with evidence
- ✅ Date-filtered research (recent info)
- ✅ Domain filtering (specific sources)
- ✅ Related questions discovery
- ✅ Cost tracking

### Models

| Model | Use Case | Cost |
|-------|----------|------|
| `sonar` | Fast, basic queries | $0.20 per 1M tokens |
| `sonar-pro` | **Recommended** - thorough research | $1.00 per 1M tokens |
| `sonar-reasoning` | Deep analysis, expert-level | $5.00 per 1M tokens |

### Setup

```typescript
import { createPerplexityService } from './services';

const perplexity = createPerplexityService({
  apiKey: 'your_perplexity_api_key',
});
```

### Usage Examples

#### Research a Question

```typescript
const result = await perplexity.research(
  'What is the best method for brewing coffee at home?',
  {
    depth: 'thorough', // Uses sonar-pro model
    returnRelatedQuestions: true,
  }
);

console.log('Answer:', result.answer);
console.log('\nCitations:');
result.citations.forEach((c, i) => {
  console.log(`${i + 1}. ${c.url}`);
});

console.log('\nRelated Questions:');
result.relatedQuestions?.forEach((q) => {
  console.log(`- ${q}`);
});

console.log('\nUsage:');
console.log(`Tokens: ${result.usage?.totalTokens}`);
```

#### Verify Claims

```typescript
const claims = [
  'French press coffee contains more caffeine than drip coffee',
  'Cold brew coffee is less acidic than hot coffee',
];

const verifications = await perplexity.verifyClaims(claims);

verifications.forEach((v) => {
  console.log(`\nClaim: ${v.claim}`);
  console.log(`Verdict: ${v.verdict} (${(v.confidence * 100).toFixed(0)}% confidence)`);
  console.log(`Evidence: ${v.evidence.join('; ')}`);
  console.log(`Sources: ${v.sources.map((s) => s.url).join(', ')}`);
});
```

#### Get Recent Information

```typescript
const news = await perplexity.getRecentInformation('coffee industry trends', 'month');

console.log('Latest Information:');
console.log(news.answer);
console.log('\nSources:', news.sources);
```

#### Compare Sources on Topic

```typescript
const comparison = await perplexity.compareSourcesOnTopic('coffee brewing methods', [
  'nytimes.com',
  'seriouseats.com',
  'bluebottlecoffee.com',
]);

console.log('Comparison:', comparison.answer);
```

### Cost Tracking

```typescript
// Get total cost for session
const totalCost = perplexity.getTotalCost();
console.log(`Total API cost: $${totalCost.toFixed(4)}`);

// Reset counters
perplexity.resetCounters();
```

---

## 5. Full Q&A Content Workflow

### End-to-End Example

```typescript
import {
  createDataForSEOClient,
  createPerplexityService,
  createShopifyBlogService,
} from './services';

async function generateAndPublishQA(keyword: string) {
  // 1. DISCOVER QUESTIONS (DataForSEO)
  console.log('Step 1: Discovering questions...');
  const dataForSEO = createDataForSEOClient({
    login: process.env.DATAFORSEO_LOGIN!,
    password: process.env.DATAFORSEO_PASSWORD!,
  });

  const paaQuestions = await dataForSEO.getPeopleAlsoAsk(keyword);
  console.log(`✓ Found ${paaQuestions.length} questions`);

  if (paaQuestions.length === 0) {
    throw new Error('No questions found');
  }

  const selectedQuestion = paaQuestions[0].question;
  console.log(`✓ Selected: "${selectedQuestion}"`);

  // 2. RESEARCH QUESTION (Perplexity)
  console.log('\nStep 2: Researching question...');
  const perplexity = createPerplexityService({
    apiKey: process.env.PERPLEXITY_API_KEY!,
  });

  const research = await perplexity.research(selectedQuestion, {
    depth: 'thorough',
    returnRelatedQuestions: true,
  });

  console.log(`✓ Research complete: ${research.answer.length} chars`);
  console.log(`✓ Citations: ${research.citations.length}`);

  // 3. GENERATE CONTENT (with schema markup)
  console.log('\nStep 3: Generating content...');
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: selectedQuestion,
        acceptedAnswer: {
          '@type': 'Answer',
          text: research.answer,
        },
      },
      // Add related questions as additional FAQ items
      ...research.relatedQuestions!.slice(0, 3).map((q) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'See main answer for details.',
        },
      })),
    ],
  };

  // 4. PUBLISH TO SHOPIFY
  console.log('\nStep 4: Publishing to Shopify...');
  const blogService = createShopifyBlogService({
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN!,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
  });

  const blog = await blogService.getDefaultBlog();

  const blogPost = await blogService.createBlogPost(blog.id, {
    title: selectedQuestion,
    bodyHtml: `
      <h1>${selectedQuestion}</h1>

      <div class="answer">
        ${research.answer.split('\n\n').map((p) => `<p>${p}</p>`).join('\n')}
      </div>

      <h2>Related Questions</h2>
      <ul>
        ${research.relatedQuestions!.slice(0, 5).map((q) => `<li>${q}</li>`).join('\n')}
      </ul>

      <h2>Sources</h2>
      <ul>
        ${research.citations.map((c) => `<li><a href="${c.url}" target="_blank">${c.url}</a></li>`).join('\n')}
      </ul>
    `,
    author: 'AI Content Engine',
    tags: ['qa', keyword.replace(/\s+/g, '-')],
    published: true,
    metafields: [
      {
        namespace: 'schema',
        key: 'faq',
        value: JSON.stringify(faqSchema),
        type: 'json_string',
      },
    ],
  });

  console.log(`✓ Published: ${blogPost.id}`);
  console.log(
    `✓ URL: https://${process.env.SHOPIFY_SHOP_DOMAIN}/blogs/${blog.handle}/${blogPost.handle}`
  );

  // 5. COST SUMMARY
  console.log('\nCost Summary:');
  console.log(`DataForSEO: $${dataForSEO.getTotalCost().toFixed(4)}`);
  console.log(`Perplexity: $${perplexity.getTotalCost().toFixed(4)}`);
  console.log(
    `Total: $${(dataForSEO.getTotalCost() + perplexity.getTotalCost()).toFixed(4)}`
  );

  return blogPost;
}

// Usage
generateAndPublishQA('coffee brewing methods').then((post) => {
  console.log('\n✅ Q&A Content Published Successfully!');
});
```

---

## 6. Error Handling

All services use consistent error types:

```typescript
import { APIError, RateLimitError, AuthenticationError } from './types/external-apis.types';

try {
  const paaQuestions = await dataForSEO.getPeopleAlsoAsk('coffee');
} catch (error) {
  if (error instanceof RateLimitError) {
    console.error(`Rate limited! Retry after ${error.retryAfter}ms`);
    // Automatic retry with exponential backoff is built-in
  } else if (error instanceof AuthenticationError) {
    console.error('Invalid API credentials');
  } else if (error instanceof APIError) {
    console.error(`API Error: ${error.message}`);
  } else {
    console.error('Unknown error:', error);
  }
}
```

---

## 7. Rate Limits & Best Practices

### DataForSEO
- **No hard rate limits** but costs add up quickly
- **Best Practice:** Batch requests when possible
- **Cost per SERP:** $0.30 (can yield 5-10 PAA questions)

### Perplexity
- **Rate Limit:** 1000 requests/minute (sonar-pro)
- **Best Practice:** Use `depth: 'basic'` for simple queries
- **Cost Optimization:** Cache research results

### Shopify
- **Rate Limit:** 40 requests/second (REST API)
- **Best Practice:** Use batch operations
- **Cost Tracking:** Built-in circuit breaker prevents overload

---

## 8. Environment Variables

```env
# DataForSEO
DATAFORSEO_LOGIN=your_email@example.com
DATAFORSEO_PASSWORD=your_password

# Perplexity
PERPLEXITY_API_KEY=your_api_key

# Shopify
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token

# Optional
DATAFORSEO_BASE_URL=https://api.dataforseo.com
PERPLEXITY_BASE_URL=https://api.perplexity.ai
```

---

## 9. Testing

Run integration tests:

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run Q&A integration tests
npm test -- qa-content-integration.test.ts

# With real API credentials (optional)
DATAFORSEO_LOGIN=your_login \
DATAFORSEO_PASSWORD=your_password \
PERPLEXITY_API_KEY=your_key \
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com \
SHOPIFY_ACCESS_TOKEN=your_token \
npm test -- qa-content-integration.test.ts
```

---

## 10. Cost Estimation

### Example: Generate 50 Q&A Blog Posts/Month

| Service | Usage | Cost |
|---------|-------|------|
| **DataForSEO** | 50 PAA requests | $15.00 |
| **Perplexity** | 50 research queries (sonar-pro, ~2000 tokens avg) | $0.10 |
| **Shopify** | 50 blog posts | FREE (included in plan) |
| **Total** | | **$15.10/month** |

**Breakdown:**
- DataForSEO: 50 keywords × $0.30/SERP = $15.00
- Perplexity: 50 queries × 2000 tokens × $1.00/1M = $0.10

---

## 11. Next Steps

1. **Implement Business Intelligence Service** - Analyze business context
2. **Create Question Discovery Service** - Combine DataForSEO + AI
3. **Build Content Generation Workflow** - Full automation
4. **Add Performance Tracking** - Monitor rankings and traffic
5. **Implement A/B Testing** - Optimize titles and meta descriptions

---

## Support

For questions or issues:
- Review the test files in `__tests__/`
- Check service documentation in each file
- Open an issue on GitHub

---

**Last Updated:** 2026-01-19
**Status:** ✅ Production Ready
