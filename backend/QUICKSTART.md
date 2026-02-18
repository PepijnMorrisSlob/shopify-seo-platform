# Quick Start Guide - API Integration Services

## Installation

```bash
cd backend
npm install
```

## Configuration

1. Copy environment template:
```bash
copy .env.example .env
```

2. Fill in your API credentials:
```bash
# Shopify (from Shopify Partners dashboard)
SHOPIFY_API_KEY=your_key_here
SHOPIFY_API_SECRET=your_secret_here

# Google Search Console (from Google Cloud Console)
GOOGLE_SEARCH_CONSOLE_CLIENT_ID=your_client_id
GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET=your_client_secret

# DataForSEO (from DataForSEO dashboard)
DATAFORSEO_LOGIN=your_login
DATAFORSEO_PASSWORD=your_password

# SEMrush (from SEMrush account)
SEMRUSH_API_KEY=your_api_key
```

## Quick Usage Examples

### 1. Shopify Product Sync

```typescript
import { createShopifyClient } from './src/services/shopify-integration-service';

// Get organization from database
const org = {
  shopDomain: 'example.myshopify.com',
  shopifyAccessToken: 'shpat_xxxxx',
  // ... other fields
};

// Create client
const shopify = await createShopifyClient(org);

// Fetch all products
const products = await shopify.getAllProducts(250);
console.log(`Fetched ${products.length} products`);

// Update SEO
await shopify.updateProductMetaTags(
  'gid://shopify/Product/123',
  'Best Product - Buy Now',
  'Amazing product description with keywords'
);
```

### 2. Google Search Console Analytics

```typescript
import { createGoogleSearchConsoleClient } from './src/services/google-search-console-service';

const gsc = createGoogleSearchConsoleClient({
  clientId: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET,
  redirectUri: 'http://localhost:3000/api/auth/google/callback',
});

// Get OAuth URL (user needs to authorize)
const authUrl = gsc.getAuthUrl();
console.log('Authorize here:', authUrl);

// After user authorizes, exchange code for tokens
const tokens = await gsc.authenticate(authorizationCode);

// Get top queries
const topQueries = await gsc.getTopQueries('https://example.com', 100, 30);
topQueries.forEach(q => {
  console.log(`${q.query}: ${q.clicks} clicks, position ${q.position.toFixed(1)}`);
});
```

### 3. Keyword Research with DataForSEO

```typescript
import { createDataForSEOClient, DATAFORSEO_LOCATIONS } from './src/services/dataforseo-service';

const dataForSEO = createDataForSEOClient({
  login: process.env.DATAFORSEO_LOGIN,
  password: process.env.DATAFORSEO_PASSWORD,
});

// Get keyword data
const keywords = ['shopify seo', 'product optimization'];
const data = await dataForSEO.getKeywordData(keywords, DATAFORSEO_LOCATIONS.UNITED_STATES);

data.forEach(kw => {
  console.log(`${kw.keyword}: ${kw.search_volume} vol/mo, $${kw.cpc} CPC`);
});

console.log(`Cost: $${dataForSEO.getTotalCost().toFixed(4)}`);
```

### 4. Competitor Analysis with SEMrush

```typescript
import { createSEMrushClient, SEMRUSH_DATABASES } from './src/services/semrush-service';

const semrush = createSEMrushClient(process.env.SEMRUSH_API_KEY);

// Get competitors
const competitors = await semrush.getCompetitors(
  'example.com',
  SEMRUSH_DATABASES.UNITED_STATES,
  10
);

console.log('Top competitors:', competitors.map(c => c.domain));

// Get keyword gaps
const gaps = await semrush.getCompetitorKeywords(
  'example.com',
  competitors[0].domain,
  SEMRUSH_DATABASES.UNITED_STATES,
  50
);

console.log(`Found ${gaps.length} keyword gaps`);
```

### 5. Webhook Handling

```typescript
import { createWebhookHandler } from './src/services/webhook-handler-service';

const webhookHandler = createWebhookHandler(process.env.SHOPIFY_API_SECRET);

// In your Express/NestJS route
app.post('/webhooks/shopify', async (req, res) => {
  const result = await webhookHandler.processWebhook(
    req.headers['x-shopify-topic'],
    req.headers['x-shopify-shop-domain'],
    req.body,
    req.headers['x-shopify-hmac-sha256'],
    req.rawBody // MUST preserve raw body!
  );

  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.status(200).json({ received: true, webhookId: result.webhookId });
});
```

## Testing

Run the examples:

```bash
# View examples
node -r ts-node/register src/examples/api-integration-examples.ts
```

## Common Issues

### 1. Rate Limit Errors

```typescript
const status = await shopify.getRateLimitStatus();
console.log(`Available: ${status.currentPoints}/${status.maxPoints}`);
```

Solution: Wait for rate limiter or reduce request frequency.

### 2. HMAC Validation Fails

Ensure you preserve the raw request body:

```typescript
// In Express middleware
app.use(express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
```

### 3. OAuth Errors

Check your redirect URI matches exactly in Google Cloud Console:
```
http://localhost:3000/api/auth/google/callback
```

## Next Steps

1. Set up database (Database Specialist)
2. Implement encryption (Security Specialist)
3. Set up SQS queues (Workflow Specialist)
4. Build frontend UI (Frontend Specialist)
5. Deploy to AWS (DevOps Specialist)

## Documentation

- Full API docs: `API_INTEGRATION_README.md`
- Delivery manifest: `API_INTEGRATION_MANIFEST.md`
- Examples: `src/examples/api-integration-examples.ts`

## Support

For issues or questions, refer to the documentation or contact the API Integration Specialist.
