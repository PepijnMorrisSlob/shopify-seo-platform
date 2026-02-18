# Shopify SEO Automation Platform - API Documentation

**Version:** 1.0
**Base URL:** `https://api.shopify-seo.com`
**Last Updated:** 2026-01-19

---

## Table of Contents

1. [Authentication](#authentication)
2. [Rate Limiting](#rate-limiting)
3. [Error Handling](#error-handling)
4. [API Endpoints](#api-endpoints)
   - [Auth Endpoints](#auth-endpoints)
   - [Product Endpoints](#product-endpoints)
   - [Content Generation Endpoints](#content-generation-endpoints)
   - [Research Endpoints](#research-endpoints)
   - [Publishing Endpoints](#publishing-endpoints)
   - [Analytics Endpoints](#analytics-endpoints)
   - [Webhook Endpoints](#webhook-endpoints)
5. [GraphQL API](#graphql-api)
6. [Webhooks](#webhooks)
7. [Code Examples](#code-examples)

---

## Authentication

### OAuth 2.0 Flow (Shopify App Installation)

The platform uses Shopify's OAuth 2.0 flow for authentication.

#### Step 1: Initiate OAuth

```http
GET /api/auth/install?shop={SHOP_DOMAIN}
```

**Parameters:**
- `shop` (required): Shopify shop domain (e.g., `mystore.myshopify.com`)

**Response:**
Redirects to Shopify OAuth consent screen.

---

#### Step 2: OAuth Callback

```http
GET /api/auth/callback?code={CODE}&hmac={HMAC}&shop={SHOP}&state={STATE}
```

**Parameters:**
- `code` (required): Authorization code from Shopify
- `hmac` (required): HMAC signature for validation
- `shop` (required): Shop domain
- `state` (required): State parameter for CSRF protection

**Response:**
```json
{
  "success": true,
  "organizationId": "org_abc123",
  "redirectUrl": "/dashboard"
}
```

---

### Session Token Validation (App Bridge)

For embedded app requests, use Shopify App Bridge session tokens.

```http
POST /api/auth/validate-session
Authorization: Bearer {SESSION_TOKEN}
```

**Request Body:**
```json
{
  "sessionToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "valid": true,
  "organizationId": "org_abc123",
  "shopDomain": "mystore.myshopify.com",
  "expiresAt": "2026-01-19T12:00:00Z"
}
```

---

### JWT Access Tokens

After OAuth, the API issues JWT access tokens for API requests.

```http
POST /api/auth/token
Content-Type: application/json

{
  "organizationId": "org_abc123",
  "refreshToken": "refresh_token_here"
}
```

**Response:**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "new_refresh_token_here",
  "expiresIn": 900,
  "tokenType": "Bearer"
}
```

**Using Access Token:**
```http
GET /api/products
Authorization: Bearer {ACCESS_TOKEN}
```

---

## Rate Limiting

### Limits

| User Type | Requests per Minute | Requests per Hour |
|-----------|---------------------|-------------------|
| Free Plan | 60 | 1,000 |
| Starter Plan | 100 | 5,000 |
| Professional Plan | 300 | 15,000 |
| Enterprise Plan | 1,000 | 50,000 |

### Rate Limit Headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642608000
```

### Rate Limit Exceeded Response

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "retryAfter": 60
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "Additional context"
    },
    "timestamp": "2026-01-19T10:30:00Z",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `INVALID_REQUEST` | Invalid request parameters |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Insufficient permissions |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Resource conflict (e.g., duplicate) |
| 422 | `VALIDATION_ERROR` | Validation failed |
| 429 | `RATE_LIMIT_EXCEEDED` | Too many requests |
| 500 | `INTERNAL_SERVER_ERROR` | Server error |
| 503 | `SERVICE_UNAVAILABLE` | Temporary service outage |

---

## API Endpoints

### Auth Endpoints

#### `GET /api/auth/install`
Initiate OAuth 2.0 flow.

**Query Parameters:**
- `shop` (required): Shop domain

**Response:** Redirect to Shopify OAuth

---

#### `GET /api/auth/callback`
OAuth callback handler.

**Query Parameters:**
- `code`, `hmac`, `shop`, `state`

**Response:**
```json
{
  "success": true,
  "organizationId": "org_abc123"
}
```

---

#### `POST /api/auth/validate-session`
Validate Shopify App Bridge session token.

**Request:**
```json
{
  "sessionToken": "eyJhbGci..."
}
```

**Response:**
```json
{
  "valid": true,
  "organizationId": "org_abc123"
}
```

---

### Product Endpoints

#### `GET /api/products`
List all products for the organization.

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
```

**Query Parameters:**
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20, max: 100): Items per page
- `search` (optional): Search by title
- `status` (optional): Filter by status (`active`, `draft`, `archived`)
- `sortBy` (optional): Sort field (`title`, `seoScore`, `createdAt`)
- `sortOrder` (optional): `asc` or `desc`

**Response:**
```json
{
  "data": [
    {
      "id": "prod_abc123",
      "shopifyProductId": "gid://shopify/Product/123456",
      "title": "Premium Wireless Headphones",
      "handle": "premium-wireless-headphones",
      "seoTitle": "Best Wireless Headphones 2026 | Premium Sound",
      "seoDescription": "Shop premium wireless headphones with noise cancellation...",
      "seoScore": 85,
      "status": "active",
      "images": ["https://cdn.shopify.com/..."],
      "createdAt": "2026-01-15T10:00:00Z",
      "updatedAt": "2026-01-18T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

#### `GET /api/products/:id`
Get product details.

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
```

**Response:**
```json
{
  "id": "prod_abc123",
  "shopifyProductId": "gid://shopify/Product/123456",
  "title": "Premium Wireless Headphones",
  "description": "Experience premium sound quality...",
  "seoTitle": "Best Wireless Headphones 2026",
  "seoDescription": "Shop premium wireless headphones...",
  "seoScore": 85,
  "keywords": ["wireless headphones", "bluetooth headphones", "noise cancelling"],
  "status": "active",
  "variants": [
    {
      "id": "var_xyz789",
      "title": "Black / Medium",
      "price": "199.99",
      "sku": "WH-1000XM5-BLK"
    }
  ],
  "images": ["https://cdn.shopify.com/..."],
  "createdAt": "2026-01-15T10:00:00Z",
  "updatedAt": "2026-01-18T14:30:00Z"
}
```

---

#### `POST /api/products/sync`
Sync products from Shopify.

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
```

**Request:**
```json
{
  "fullSync": false,
  "limit": 250
}
```

**Response:**
```json
{
  "jobId": "job_sync_abc123",
  "status": "queued",
  "estimatedDuration": 120,
  "message": "Product sync initiated. Check status at /api/jobs/job_sync_abc123"
}
```

---

#### `PUT /api/products/:id`
Update product SEO metadata.

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

**Request:**
```json
{
  "seoTitle": "Best Wireless Headphones 2026 | Premium Sound Quality",
  "seoDescription": "Shop premium wireless headphones with active noise cancellation. Free shipping on orders over $50. 30-day returns guaranteed.",
  "publishToShopify": true
}
```

**Response:**
```json
{
  "id": "prod_abc123",
  "seoTitle": "Best Wireless Headphones 2026 | Premium Sound Quality",
  "seoDescription": "Shop premium wireless headphones...",
  "seoScore": 92,
  "updatedAt": "2026-01-19T10:45:00Z",
  "publishedToShopify": true
}
```

---

### Content Generation Endpoints

#### `POST /api/content/generate`
Generate AI content variants.

**Headers:**
```
Authorization: Bearer {ACCESS_TOKEN}
Content-Type: application/json
```

**Request:**
```json
{
  "productId": "prod_abc123",
  "contentType": "product_meta",
  "input": {
    "productTitle": "Premium Wireless Headphones",
    "productDescription": "High-quality audio experience",
    "productType": "Electronics",
    "keywords": ["wireless headphones", "bluetooth headphones"],
    "targetAudience": "Music lovers and audiophiles",
    "brandVoice": "Professional yet approachable",
    "tone": "enthusiastic",
    "maxLength": 60
  },
  "variantCount": 3,
  "model": "auto"
}
```

**Response:**
```json
{
  "variants": [
    {
      "id": "var_1",
      "content": "Premium Wireless Headphones - Free Shipping | Audiophile Sound",
      "model": "gpt-3.5-turbo",
      "qualityScore": {
        "overall": 92,
        "readability": { "score": 95, "fleschReadingEase": 72 },
        "seoOptimization": { "score": 90, "keywordDensity": 2.5, "hasLSIKeywords": true },
        "uniqueness": { "score": 88, "similarityWithExisting": 0.15 },
        "brandAlignment": { "score": 94, "embeddingSimilarity": 0.82 },
        "factualAccuracy": { "score": 100, "citationsProvided": false },
        "recommendation": "auto_approve"
      },
      "metadata": {
        "promptTokens": 150,
        "completionTokens": 25,
        "totalTokens": 175,
        "cost": 0.00026,
        "generationTime": 1200,
        "temperature": 0.7
      }
    },
    {
      "id": "var_2",
      "content": "Best Bluetooth Headphones 2026 | Wireless & Noise Cancelling",
      "model": "gpt-3.5-turbo",
      "qualityScore": {
        "overall": 88,
        "recommendation": "auto_approve"
      }
    },
    {
      "id": "var_3",
      "content": "Shop Premium Wireless Headphones - Audiophile Quality Sound",
      "model": "gpt-3.5-turbo",
      "qualityScore": {
        "overall": 85,
        "recommendation": "auto_approve"
      }
    }
  ],
  "selectedVariant": "var_1",
  "totalCost": 0.00078
}
```

---

#### `POST /api/content/score`
Score content quality.

**Request:**
```json
{
  "content": "Premium Wireless Headphones - Free Shipping",
  "criteria": {
    "enableReadability": true,
    "enableSEO": true,
    "enableUniqueness": true,
    "targetKeywords": ["wireless headphones"],
    "existingContent": ["Old meta title here..."]
  }
}
```

**Response:**
```json
{
  "overall": 88,
  "readability": {
    "score": 90,
    "fleschKincaidGrade": 8.2,
    "fleschReadingEase": 68,
    "recommendation": "Excellent readability"
  },
  "seoOptimization": {
    "score": 85,
    "keywordDensity": 2.8,
    "hasLSIKeywords": true,
    "lsiKeywords": ["bluetooth", "noise cancelling", "premium"],
    "hasCallToAction": false,
    "hasNumbers": false,
    "recommendation": "Good SEO, consider adding CTA"
  },
  "uniqueness": {
    "score": 92,
    "similarityWithExisting": 0.12,
    "originalityPercentage": 88,
    "recommendation": "Excellent uniqueness"
  },
  "recommendation": "auto_approve"
}
```

---

#### `GET /api/content/costs/:organizationId`
Get AI content generation costs.

**Query Parameters:**
- `period` (required): `daily`, `weekly`, or `monthly`
- `startDate` (optional): ISO date string
- `endDate` (optional): ISO date string

**Response:**
```json
{
  "organizationId": "org_abc123",
  "period": "monthly",
  "totalCost": 45.67,
  "totalTokens": 2500000,
  "breakdown": [
    {
      "model": "gpt-3.5-turbo",
      "requests": 1200,
      "tokens": 1500000,
      "cost": 12.50
    },
    {
      "model": "gpt-4-turbo",
      "requests": 150,
      "tokens": 800000,
      "cost": 28.00
    },
    {
      "model": "claude-sonnet-4",
      "requests": 80,
      "tokens": 200000,
      "cost": 5.17
    }
  ]
}
```

---

### Research Endpoints

#### `POST /api/research/keywords`
Get keyword research data.

**Request:**
```json
{
  "keyword": "wireless headphones",
  "location": "United States",
  "language": "en"
}
```

**Response:**
```json
{
  "keyword": "wireless headphones",
  "searchVolume": 165000,
  "difficulty": 68,
  "cpc": 2.45,
  "competition": "high",
  "relatedKeywords": [
    {
      "keyword": "best wireless headphones",
      "searchVolume": 74000,
      "difficulty": 72,
      "cpc": 3.10
    },
    {
      "keyword": "bluetooth headphones",
      "searchVolume": 201000,
      "difficulty": 65,
      "cpc": 2.20
    }
  ],
  "questions": [
    "what are the best wireless headphones",
    "how do wireless headphones work",
    "are wireless headphones safe"
  ]
}
```

---

#### `POST /api/research/competitors`
Analyze competitor products.

**Request:**
```json
{
  "productUrl": "https://example.com/product/wireless-headphones",
  "analysisDepth": "moderate"
}
```

**Response:**
```json
{
  "competitorUrl": "https://example.com/product/wireless-headphones",
  "seoScore": 78,
  "metaTitle": "Competitor's Meta Title",
  "metaDescription": "Competitor's meta description...",
  "keywords": ["wireless", "bluetooth", "headphones"],
  "contentLength": 1250,
  "backlinks": 342,
  "domainAuthority": 65,
  "recommendations": [
    "Include more LSI keywords",
    "Add customer reviews",
    "Optimize image alt text"
  ]
}
```

---

### Publishing Endpoints

#### `POST /api/publish/:productId`
Publish content to Shopify.

**Request:**
```json
{
  "contentId": "content_abc123",
  "publishNow": true,
  "notifyUser": true
}
```

**Response:**
```json
{
  "success": true,
  "productId": "prod_abc123",
  "shopifyProductId": "gid://shopify/Product/123456",
  "publishedContent": {
    "seoTitle": "Best Wireless Headphones 2026",
    "seoDescription": "Shop premium wireless headphones..."
  },
  "publishedAt": "2026-01-19T11:00:00Z"
}
```

---

#### `POST /api/publish/bulk`
Bulk publish content for multiple products.

**Request:**
```json
{
  "products": [
    {
      "productId": "prod_abc123",
      "contentId": "content_xyz789"
    },
    {
      "productId": "prod_def456",
      "contentId": "content_uvw234"
    }
  ],
  "publishNow": true
}
```

**Response:**
```json
{
  "jobId": "job_publish_bulk_abc123",
  "status": "queued",
  "totalProducts": 2,
  "estimatedDuration": 30,
  "message": "Bulk publish initiated"
}
```

---

#### `GET /api/publish/calendar`
Get content calendar (scheduled publishing).

**Query Parameters:**
- `startDate` (required): ISO date
- `endDate` (required): ISO date

**Response:**
```json
{
  "scheduledPublications": [
    {
      "id": "sched_abc123",
      "productId": "prod_abc123",
      "productTitle": "Premium Wireless Headphones",
      "scheduledFor": "2026-01-20T09:00:00Z",
      "status": "scheduled",
      "content": {
        "seoTitle": "...",
        "seoDescription": "..."
      }
    }
  ]
}
```

---

### Analytics Endpoints

#### `GET /api/analytics/seo-score/:productId`
Get SEO score for a product.

**Response:**
```json
{
  "productId": "prod_abc123",
  "seoScore": 85,
  "scoreBreakdown": {
    "metaTitle": { "score": 90, "issues": [] },
    "metaDescription": { "score": 85, "issues": ["Add call-to-action"] },
    "keywords": { "score": 80, "issues": ["Low keyword density"] },
    "images": { "score": 75, "issues": ["Missing alt text on 2 images"] },
    "structuredData": { "score": 100, "issues": [] }
  },
  "recommendations": [
    "Add call-to-action to meta description",
    "Increase keyword density to 1.5-2.5%",
    "Add alt text to product images"
  ],
  "lastUpdated": "2026-01-19T10:00:00Z"
}
```

---

#### `GET /api/analytics/gsc`
Get Google Search Console data.

**Query Parameters:**
- `startDate` (required): YYYY-MM-DD
- `endDate` (required): YYYY-MM-DD
- `dimension` (optional): `query`, `page`, `device`

**Response:**
```json
{
  "data": [
    {
      "query": "wireless headphones",
      "clicks": 1250,
      "impressions": 15600,
      "ctr": 8.01,
      "position": 4.2
    },
    {
      "query": "best bluetooth headphones",
      "clicks": 890,
      "impressions": 12300,
      "ctr": 7.23,
      "position": 5.1
    }
  ],
  "totals": {
    "clicks": 5670,
    "impressions": 78900,
    "averageCTR": 7.18,
    "averagePosition": 6.3
  }
}
```

---

#### `GET /api/analytics/keywords/:productId`
Get keyword position tracking for a product.

**Response:**
```json
{
  "productId": "prod_abc123",
  "keywords": [
    {
      "keyword": "wireless headphones",
      "currentPosition": 4,
      "previousPosition": 7,
      "change": -3,
      "searchVolume": 165000,
      "clicks": 1250,
      "impressions": 15600,
      "ctr": 8.01,
      "history": [
        { "date": "2026-01-15", "position": 7 },
        { "date": "2026-01-16", "position": 6 },
        { "date": "2026-01-17", "position": 5 },
        { "date": "2026-01-18", "position": 4 },
        { "date": "2026-01-19", "position": 4 }
      ]
    }
  ]
}
```

---

### Webhook Endpoints

#### `POST /api/webhooks/shopify`
Receive Shopify webhooks (called by Shopify, not clients).

**Headers:**
```
X-Shopify-Topic: products/update
X-Shopify-Hmac-SHA256: {HMAC}
X-Shopify-Shop-Domain: mystore.myshopify.com
X-Shopify-Webhook-Id: webhook_123456
```

**Request Body:**
```json
{
  "id": 123456789,
  "title": "Premium Wireless Headphones",
  "handle": "premium-wireless-headphones",
  "updated_at": "2026-01-19T10:30:00Z"
}
```

**Response:**
```http
HTTP/1.1 200 OK

{
  "received": true
}
```

---

#### `GET /api/webhooks/status`
Get webhook processing status.

**Response:**
```json
{
  "totalProcessed": 15670,
  "totalFailed": 12,
  "queueDepth": 3,
  "averageProcessingTime": 150,
  "lastProcessedAt": "2026-01-19T11:05:00Z"
}
```

---

## GraphQL API

### Endpoint

```
POST /graphql
```

### Schema Overview

```graphql
type Query {
  products(
    page: Int
    limit: Int
    search: String
    status: ProductStatus
  ): ProductConnection!

  product(id: ID!): Product

  contentGenerations(
    productId: ID
    status: ContentStatus
  ): [ContentGeneration!]!

  analytics(
    startDate: String!
    endDate: String!
    productId: ID
  ): Analytics!
}

type Mutation {
  generateContent(input: GenerateContentInput!): GenerateContentResult!

  publishContent(productId: ID!, contentId: ID!): PublishResult!

  updateProduct(id: ID!, input: UpdateProductInput!): Product!
}

type Product {
  id: ID!
  shopifyProductId: String!
  title: String!
  seoTitle: String
  seoDescription: String
  seoScore: Int
  status: ProductStatus!
  keywords: [Keyword!]!
  contentGenerations: [ContentGeneration!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

type ContentGeneration {
  id: ID!
  content: String!
  model: AIModel!
  qualityScore: QualityScore!
  status: ContentStatus!
  createdAt: DateTime!
}

type QualityScore {
  overall: Int!
  readability: Int!
  seoOptimization: Int!
  uniqueness: Int!
  recommendation: Recommendation!
}

enum ProductStatus {
  ACTIVE
  DRAFT
  ARCHIVED
}

enum ContentStatus {
  PENDING
  GENERATED
  APPROVED
  REJECTED
  PUBLISHED
}

enum AIModel {
  GPT_3_5_TURBO
  GPT_4_TURBO
  CLAUDE_SONNET_4
  PERPLEXITY_SONAR_PRO
}

enum Recommendation {
  AUTO_APPROVE
  MANUAL_REVIEW
  AUTO_REJECT
}
```

### Example Queries

#### Get Products with Content

```graphql
query GetProducts {
  products(page: 1, limit: 10, status: ACTIVE) {
    edges {
      node {
        id
        title
        seoTitle
        seoScore
        contentGenerations(status: APPROVED) {
          id
          content
          qualityScore {
            overall
            recommendation
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      totalPages
    }
  }
}
```

#### Generate Content

```graphql
mutation GenerateContent {
  generateContent(
    input: {
      productId: "prod_abc123"
      contentType: PRODUCT_META
      input: {
        productTitle: "Premium Wireless Headphones"
        keywords: ["wireless headphones", "bluetooth"]
        tone: ENTHUSIASTIC
      }
      variantCount: 3
    }
  ) {
    variants {
      id
      content
      qualityScore {
        overall
        recommendation
      }
    }
  }
}
```

---

## Webhooks

### Subscribing to Webhooks

Webhooks are automatically configured during OAuth installation.

### Supported Webhook Topics

| Topic | Description |
|-------|-------------|
| `products/create` | New product created |
| `products/update` | Product updated |
| `products/delete` | Product deleted |
| `app/uninstalled` | App uninstalled |

### Webhook Payload Example

```json
{
  "id": 123456789,
  "title": "Premium Wireless Headphones",
  "handle": "premium-wireless-headphones",
  "body_html": "<p>Product description</p>",
  "vendor": "MyBrand",
  "product_type": "Electronics",
  "created_at": "2026-01-15T10:00:00Z",
  "updated_at": "2026-01-19T10:30:00Z",
  "published_at": "2026-01-15T10:00:00Z",
  "tags": "wireless, headphones, bluetooth",
  "variants": [...],
  "images": [...]
}
```

### HMAC Validation

Validate webhook HMAC signature:

```javascript
const crypto = require('crypto');

function validateHmac(body, hmacHeader, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');

  return hash === hmacHeader;
}
```

---

## Code Examples

### JavaScript/TypeScript

#### Generate Content

```typescript
import axios from 'axios';

const generateContent = async (productId: string, accessToken: string) => {
  const response = await axios.post(
    'https://api.shopify-seo.com/api/content/generate',
    {
      productId,
      contentType: 'product_meta',
      input: {
        productTitle: 'Premium Wireless Headphones',
        keywords: ['wireless headphones', 'bluetooth headphones'],
        tone: 'enthusiastic',
      },
      variantCount: 3,
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};
```

---

#### Publish Content

```typescript
const publishContent = async (
  productId: string,
  contentId: string,
  accessToken: string
) => {
  const response = await axios.post(
    `https://api.shopify-seo.com/api/publish/${productId}`,
    {
      contentId,
      publishNow: true,
      notifyUser: true,
    },
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return response.data;
};
```

---

### Python

```python
import requests

def generate_content(product_id: str, access_token: str):
    url = "https://api.shopify-seo.com/api/content/generate"

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    payload = {
        "productId": product_id,
        "contentType": "product_meta",
        "input": {
            "productTitle": "Premium Wireless Headphones",
            "keywords": ["wireless headphones", "bluetooth headphones"],
            "tone": "enthusiastic"
        },
        "variantCount": 3
    }

    response = requests.post(url, json=payload, headers=headers)
    return response.json()
```

---

### cURL

```bash
# Generate content
curl -X POST https://api.shopify-seo.com/api/content/generate \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "prod_abc123",
    "contentType": "product_meta",
    "input": {
      "productTitle": "Premium Wireless Headphones",
      "keywords": ["wireless headphones"],
      "tone": "enthusiastic"
    },
    "variantCount": 3
  }'

# Get products
curl -X GET "https://api.shopify-seo.com/api/products?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Publish content
curl -X POST https://api.shopify-seo.com/api/publish/prod_abc123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "content_xyz789",
    "publishNow": true
  }'
```

---

## Pagination

All list endpoints support cursor-based pagination:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

## Versioning

The API uses URL versioning:

```
https://api.shopify-seo.com/v1/products
https://api.shopify-seo.com/v2/products
```

Current version: `v1` (default, no version prefix required)

---

## Support

**API Issues:** api-support@shopify-seo.com
**Documentation:** https://docs.shopify-seo.com
**Status Page:** https://status.shopify-seo.com

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
