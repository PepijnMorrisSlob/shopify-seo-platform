# Shopify SEO Platform - External Integrations

## Overview

The platform integrates with multiple external APIs for e-commerce, SEO analytics, AI content generation, and cloud services.

---

## 1. Shopify Integration

### Service Files
- `backend/src/services/shopify-service.ts` - Product sync & SEO updates
- `backend/src/services/shopify-blog-service.ts` - Blog post management
- `backend/src/services/shopify-pages-service.ts` - Static page management
- `backend/src/services/shopify-integration-service.ts` - High-level integration
- `backend/src/services/auth-service.ts` - OAuth authentication

### API Details
| Aspect | Details |
|--------|---------|
| **API Type** | GraphQL Admin API + REST Admin API |
| **API Version** | 2026-01 |
| **SDK** | @shopify/shopify-api ^10.0.0 |

### Authentication
- **Type:** OAuth 2.0
- **Flow:** Installation flow with HMAC validation
- **Token Storage:** AES-256-GCM encrypted in PostgreSQL
- **Scopes:** `read_products, write_products, read_content, write_content, read_script_tags, write_script_tags`

### Features Implemented
- Product sync (paginated with cursor)
- Product SEO field updates (title, description)
- Blog post CRUD operations
- Blog metafields (schema markup)
- Webhook processing (products/create, products/update, app/uninstalled)
- Rate limit handling with retry logic
- HMAC validation for webhooks

### Rate Limiting
- GraphQL cost-based rate limiting
- Automatic retry on 429 responses
- Circuit breaker pattern for resilience

---

## 2. Google Search Console Integration

### Service File
`backend/src/services/google-search-console-service.ts`

### API Details
| Aspect | Details |
|--------|---------|
| **API Type** | REST API |
| **API Version** | v1 |
| **SDK** | googleapis ^131.0.0 |
| **Daily Quota** | 100,000 requests |
| **Cost** | FREE |

### Authentication
- **Type:** OAuth 2.0
- **Scopes:**
  - `webmasters.readonly` (read-only access)
  - `webmasters` (full access)
- **Token Management:** Refresh token stored, auto-refresh on expiry
- **Redirect URI:** Configured via `GOOGLE_SEARCH_CONSOLE_REDIRECT_URI`

### Features Implemented
- OAuth authorization flow
- Performance data (clicks, impressions, CTR, position)
- Top queries by site
- Top pages by site
- Page-specific performance
- Query-specific performance
- Site listing

### Dimensions Supported
- query
- page
- country
- device
- searchAppearance
- date

### Rate Limiting
- Custom rate limiter (95% threshold)
- Automatic retry with exponential backoff
- Circuit breaker (5 failures, 60s reset)

---

## 3. DataForSEO Integration

### Service File
`backend/src/services/dataforseo-service.ts`

### API Details
| Aspect | Details |
|--------|---------|
| **API Type** | REST API |
| **API Version** | v3 |
| **Pricing** | Pay-as-you-go |

### Pricing (per request)
- Keyword data: $0.15 per 100 keywords
- SERP data: $0.30 per request
- Keyword suggestions: $0.05 per request

### Authentication
- **Type:** HTTP Basic Auth
- **Credentials:** Login + Password from environment

### Features Implemented
- Keyword research (search volume, difficulty, CPC)
- SERP analysis (top 100 positions)
- Keyword suggestions (related keywords)
- People Also Ask (PAA) questions
- Related searches extraction
- Competitor content analysis
- Domain keyword rankings
- Top pages analysis

### Batch Processing
- Configurable batch size (default: 100 keywords)
- Sequential processing with delays
- Cost tracking per session

### Location Support
```typescript
DATAFORSEO_LOCATIONS = {
  UNITED_STATES: 2840,
  UNITED_KINGDOM: 2826,
  CANADA: 2124,
  AUSTRALIA: 2036,
  // ... more countries
}
```

---

## 4. SEMrush Integration

### Service File
`backend/src/services/semrush-service.ts`

### API Details
| Aspect | Details |
|--------|---------|
| **API Type** | REST API (CSV response) |
| **Pricing** | $549/month (Business plan) |
| **Monthly Quota** | 10,000 API units |
| **Rate Limit** | 10 requests/second |

### Authentication
- **Type:** API Key (query parameter)
- **Key Management:** From environment `SEMRUSH_API_KEY`

### Features Implemented
- Domain overview (organic & paid metrics)
- Domain organic keywords
- Keyword metrics (difficulty, volume, CPC)
- Competitor analysis
- Competitor unique keywords
- Backlink analysis
- Backlink overview statistics
- Topical maps (via related keywords)

### Database Codes
```typescript
SEMRUSH_DATABASES = {
  UNITED_STATES: 'us',
  UNITED_KINGDOM: 'uk',
  CANADA: 'ca',
  AUSTRALIA: 'au',
  // ... more regions
}
```

---

## 5. AI Content Generation

### Service Files
- `backend/src/services/ai-content-service.ts` - Multi-model orchestration
- `backend/src/services/perplexity-service.ts` - Research service

### Models Supported

| Model | Provider | Use Case |
|-------|----------|----------|
| GPT-3.5 Turbo | OpenAI | Product meta titles/descriptions |
| GPT-4 Turbo | OpenAI | Product descriptions, fallback |
| Claude Sonnet 4 | Anthropic | Blog posts, schema markup |
| Sonar Pro | Perplexity | Research, fact-checking |

### Model Routing Strategy
```typescript
AI_MODEL_ROUTING = {
  product_meta: { primary: 'gpt-3.5-turbo', fallbacks: ['gpt-4-turbo', 'claude-sonnet-4'] },
  product_description: { primary: 'gpt-4-turbo', fallbacks: ['claude-sonnet-4', 'gpt-3.5-turbo'] },
  blog_post: { primary: 'claude-sonnet-4', fallbacks: ['gpt-4-turbo', 'gpt-3.5-turbo'] },
  research: { primary: 'perplexity-sonar-pro', fallbacks: ['gpt-4-turbo', 'claude-sonnet-4'] },
  schema: { primary: 'claude-sonnet-4', fallbacks: ['gpt-4-turbo'] },
}
```

### Pricing (per 1M tokens)
| Model | Input | Output |
|-------|-------|--------|
| GPT-3.5 Turbo | $0.50 | $1.50 |
| GPT-4 Turbo | $10.00 | $30.00 |
| Claude Sonnet 4 | $3.00 | $15.00 |
| Perplexity Sonar Pro | $1.00 | $1.00 |

### Authentication
- **OpenAI:** API Key + Organization ID
- **Anthropic:** API Key
- **Perplexity:** Bearer token

### Features
- Variant generation (3 variants per request)
- Quality scoring (5 criteria: readability, SEO, uniqueness, brand alignment, factual accuracy)
- Automatic approval/rejection based on scores
- Cost tracking per organization
- Temperature variation for diversity
- Business-aware Q&A content generation

---

## 6. AWS Services Integration

### Service Configuration
Via `aws-sdk ^2.1534.0`

### S3 Buckets
| Bucket | Purpose |
|--------|---------|
| `S3_CONTENT_BUCKET` | Generated content storage |
| `S3_IMAGES_BUCKET` | Optimized images |

### SQS Queues
| Queue | Purpose |
|-------|---------|
| `SQS_WEBHOOKS_QUEUE_URL` | Shopify webhook processing (FIFO) |
| `SQS_CONTENT_QUEUE_URL` | Content generation jobs |

### SES (Email)
- Transactional emails
- Configuration set for tracking

### CloudFront
- CDN for static assets
- Custom domain support

### Authentication
- **Type:** IAM credentials
- **Credentials:** Access Key ID + Secret Access Key from environment

---

## 7. Monitoring & Error Tracking

### DataDog
| Feature | Purpose |
|---------|---------|
| APM | Application performance monitoring |
| Logs | Centralized logging |
| Metrics | Custom metrics |

Configuration:
```env
DATADOG_API_KEY=...
DATADOG_APP_KEY=...
DD_ENV=development
DD_SERVICE=shopify-seo-platform
DD_LOGS_ENABLED=true
DD_APM_ENABLED=true
```

### Sentry
| Feature | Purpose |
|---------|---------|
| Error Tracking | Exception capture |
| Performance | Trace sampling |
| Profiling | Code profiling |

Configuration:
```env
SENTRY_DSN=...
SENTRY_ENVIRONMENT=development
SENTRY_TRACES_SAMPLE_RATE=0.1
SENTRY_PROFILES_SAMPLE_RATE=0.1
```

---

## 8. Email Services

### SendGrid (Primary)
- Transactional email delivery
- Template support
- From: `noreply@shopify-seo.com`

### AWS SES (Alternative)
- Configuration set for tracking
- Used as fallback

---

## Integration Patterns

### Common Patterns Used

1. **Circuit Breaker**
   - Failure threshold: 5
   - Reset timeout: 60 seconds
   - Prevents cascade failures

2. **Retry with Exponential Backoff**
   - Max attempts: 3
   - Initial delay: 1-2 seconds
   - Max delay: 30 seconds
   - Retryable codes: 408, 429, 500, 502, 503, 504

3. **Rate Limiting**
   - Token bucket algorithm
   - Per-service rate limits
   - Queue-based throttling

4. **Factory Pattern**
   - `createGoogleSearchConsoleClient()`
   - `createDataForSEOClient()`
   - `createSEMrushClient()`
   - `createShopifyBlogService()`

5. **Service Layer Abstraction**
   - All external APIs wrapped in service classes
   - Unified error handling (APIError, AuthenticationError, RateLimitError)
   - Consistent logging

---

## Security Considerations

### Token Storage
- Shopify access tokens: AES-256-GCM encrypted
- Google OAuth tokens: Stored with refresh capability
- API keys: Environment variables only

### Validation
- HMAC validation for all Shopify webhooks
- State parameter for OAuth CSRF protection
- Timestamp validation for replay attack prevention

### Audit Logging
- All sensitive data access logged
- Security events tracked (login, token refresh, etc.)
- GDPR compliance audit trail
