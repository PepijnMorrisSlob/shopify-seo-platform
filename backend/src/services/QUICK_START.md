# Quick Start - API Integration

**Get started with Q&A content generation in 5 minutes**

---

## 1. Install Dependencies

```bash
npm install axios
```

---

## 2. Set Environment Variables

Create `.env` file:

```env
DATAFORSEO_LOGIN=your_email@example.com
DATAFORSEO_PASSWORD=your_password
PERPLEXITY_API_KEY=your_api_key
SHOPIFY_SHOP_DOMAIN=your-shop.myshopify.com
SHOPIFY_ACCESS_TOKEN=your_access_token
```

---

## 3. Generate Your First Q&A Post

```typescript
import {
  createDataForSEOClient,
  createPerplexityService,
  createShopifyBlogService,
} from './services';

async function main() {
  // Initialize services
  const dataForSEO = createDataForSEOClient({
    login: process.env.DATAFORSEO_LOGIN!,
    password: process.env.DATAFORSEO_PASSWORD!,
  });

  const perplexity = createPerplexityService({
    apiKey: process.env.PERPLEXITY_API_KEY!,
  });

  const blog = createShopifyBlogService({
    shopDomain: process.env.SHOPIFY_SHOP_DOMAIN!,
    accessToken: process.env.SHOPIFY_ACCESS_TOKEN!,
  });

  // 1. Find questions people are asking
  const questions = await dataForSEO.getPeopleAlsoAsk('your product category');

  // 2. Pick the best question
  const question = questions[0].question;

  // 3. Research it with AI
  const research = await perplexity.research(question);

  // 4. Publish to Shopify
  const defaultBlog = await blog.getDefaultBlog();

  const post = await blog.createBlogPost(defaultBlog.id, {
    title: question,
    bodyHtml: `<p>${research.answer}</p>`,
    tags: ['qa'],
    published: true,
  });

  console.log(`✅ Published: https://${process.env.SHOPIFY_SHOP_DOMAIN}/blogs/${defaultBlog.handle}/${post.handle}`);
}

main();
```

---

## 4. API Cheat Sheet

### Get Questions (DataForSEO)

```typescript
// Get "People Also Ask" questions
const paa = await dataForSEO.getPeopleAlsoAsk('coffee brewing');
// Cost: $0.30

// Get related searches
const related = await dataForSEO.getRelatedSearches('coffee brewing');
// Cost: $0.30

// Analyze competitor
const competitor = await dataForSEO.getCompetitorContent('competitor.com');
// Cost: $0.50
```

### Research Content (Perplexity)

```typescript
// Basic research (fast & cheap)
const basic = await perplexity.research('your question', { depth: 'basic' });
// Cost: ~$0.0004

// Thorough research (recommended)
const thorough = await perplexity.research('your question', { depth: 'thorough' });
// Cost: ~$0.002

// Expert-level research
const expert = await perplexity.research('your question', { depth: 'expert' });
// Cost: ~$0.01
```

### Publish to Shopify

```typescript
// Blog post
const post = await blog.createBlogPost(blogId, {
  title: 'Your Question',
  bodyHtml: '<p>Your answer</p>',
  tags: ['qa', 'topic'],
  published: true,
});
// Cost: FREE

// Page
const page = await pages.createPage({
  title: 'How-To Guide',
  bodyHtml: '<h1>Steps</h1>',
  published: true,
});
// Cost: FREE
```

---

## 5. Schema Markup Examples

### FAQ Schema

```typescript
const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Question here?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Answer here.',
      },
    },
  ],
};

await blog.createBlogPost(blogId, {
  title: 'Question here?',
  bodyHtml: '<p>Answer here.</p>',
  metafields: [
    {
      namespace: 'schema',
      key: 'faq',
      value: JSON.stringify(faqSchema),
      type: 'json_string',
    },
  ],
});
```

### HowTo Schema

```typescript
const howToSchema = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to do something',
  step: [
    {
      '@type': 'HowToStep',
      name: 'Step 1',
      text: 'Do this first',
    },
  ],
};

await pages.createPage({
  title: 'How to do something',
  bodyHtml: '<ol><li>Do this first</li></ol>',
  metafields: [
    {
      namespace: 'schema',
      key: 'how_to',
      value: JSON.stringify(howToSchema),
      type: 'json_string',
    },
  ],
});
```

---

## 6. Cost Calculator

### Per Q&A Post

| Task | Service | Cost |
|------|---------|------|
| Find questions | DataForSEO | $0.30 |
| Research answer | Perplexity (sonar-pro) | $0.002 |
| Publish to Shopify | Shopify | FREE |
| **TOTAL PER POST** | | **$0.302** |

### Monthly Estimates

| Posts/Month | Total Cost |
|-------------|------------|
| 10 | $3.02 |
| 50 | $15.10 |
| 100 | $30.20 |
| 200 | $60.40 |

**Note:** Costs are estimates. Actual costs vary based on:
- Number of questions per SERP (DataForSEO)
- Content length (Perplexity tokens)
- Batch operations (can reduce costs)

---

## 7. Error Handling

```typescript
import { APIError, RateLimitError, AuthenticationError } from './types/external-apis.types';

try {
  const result = await perplexity.research('question');
} catch (error) {
  if (error instanceof RateLimitError) {
    // Wait and retry (automatic retry built-in)
    console.log(`Rate limited, retrying in ${error.retryAfter}ms`);
  } else if (error instanceof AuthenticationError) {
    console.error('Check your API credentials');
  } else if (error instanceof APIError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`);
  }
}
```

---

## 8. Tips for Cost Optimization

### DataForSEO
✅ **DO:** Batch PAA requests (1 SERP = 5-10 questions)
✅ **DO:** Cache questions in database
❌ **DON'T:** Request same keyword multiple times

### Perplexity
✅ **DO:** Use `depth: 'basic'` for simple questions
✅ **DO:** Cache research results
❌ **DON'T:** Use `sonar-reasoning` unless necessary

### Shopify
✅ **DO:** Use bulk operations when possible
✅ **DO:** Update existing posts rather than creating duplicates
❌ **DON'T:** Exceed rate limits (40 req/sec)

---

## 9. Testing

```bash
# Run tests (uses mock data)
npm test

# Test with real APIs (costs money!)
DATAFORSEO_LOGIN=your_login \
PERPLEXITY_API_KEY=your_key \
npm test -- qa-content-integration.test.ts
```

---

## 10. Next Steps

1. ✅ Set up environment variables
2. ✅ Test with one Q&A post
3. ⏭️ Automate with cron jobs
4. ⏭️ Add performance tracking
5. ⏭️ Implement A/B testing

---

## Need Help?

- 📖 Full documentation: `API_INTEGRATION_GUIDE.md`
- 🧪 Test examples: `__tests__/qa-content-integration.test.ts`
- 🐛 Report issues on GitHub

---

**Happy Q&A content creation! 🚀**
