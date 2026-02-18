# Shopify SEO Automation Platform - Troubleshooting Guide

**Version:** 1.0
**Last Updated:** 2026-01-19

---

## Table of Contents

1. [Common Issues](#common-issues)
2. [Authentication Issues](#authentication-issues)
3. [Database Issues](#database-issues)
4. [API Issues](#api-issues)
5. [AI Content Generation Issues](#ai-content-generation-issues)
6. [Performance Issues](#performance-issues)
7. [Deployment Issues](#deployment-issues)
8. [Monitoring & Debugging](#monitoring--debugging)
9. [Error Codes Reference](#error-codes-reference)
10. [Getting Help](#getting-help)

---

## Common Issues

### Issue: Application won't start locally

**Symptoms:**
- `npm run dev` fails
- Port already in use error
- Database connection error

**Solutions:**

1. **Check if services are running:**
```bash
docker compose ps
```

2. **Start required services:**
```bash
docker compose up -d postgres redis
```

3. **Check port conflicts:**
```bash
# Windows
netstat -ano | findstr :3000
netstat -ano | findstr :5173

# Kill process using port
taskkill /PID <PID> /F
```

4. **Verify environment variables:**
```bash
# Check .env file exists
ls -la .env

# Verify DATABASE_URL is set
echo $DATABASE_URL  # Linux/Mac
echo %DATABASE_URL%  # Windows
```

5. **Clear node_modules and reinstall:**
```bash
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: Database migrations fail

**Symptoms:**
- `prisma migrate dev` fails
- "Relation already exists" error
- Migration timeout

**Solutions:**

1. **Reset database (⚠️ deletes all data):**
```bash
npx prisma migrate reset
```

2. **Check database connection:**
```bash
# Test connection
psql $DATABASE_URL

# If connection fails, check:
# - Database is running (docker compose ps)
# - Credentials are correct
# - Port is accessible (5432)
```

3. **Manually apply migration:**
```bash
# Deploy pending migrations
npx prisma migrate deploy

# Resolve migration conflicts
npx prisma migrate resolve --applied "migration_name"
```

4. **Check migration history:**
```sql
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC;
```

---

### Issue: Frontend can't connect to backend

**Symptoms:**
- CORS errors in browser console
- 404 errors when calling API
- Network request timeout

**Solutions:**

1. **Verify backend is running:**
```bash
curl http://localhost:3000/health
```

2. **Check CORS configuration:**
```typescript
// backend/src/main.ts
app.enableCors({
  origin: 'http://localhost:5173', // Match frontend URL
  credentials: true,
});
```

3. **Verify API base URL in frontend:**
```typescript
// frontend/src/config.ts
export const API_BASE_URL = 'http://localhost:3000';
```

4. **Check browser network tab:**
- Request URL correct?
- Status code?
- Response headers?

---

## Authentication Issues

### Issue: OAuth installation fails

**Symptoms:**
- "invalid_request" error
- HMAC validation fails
- Redirect loop

**Solutions:**

1. **Verify Shopify app credentials:**
```bash
# Check .env
SHOPIFY_API_KEY=<from Shopify Partners>
SHOPIFY_API_SECRET=<from Shopify Partners>
```

2. **Check redirect URI matches:**
```
Shopify App Settings:
https://yourapp.com/api/auth/callback

Code:
app.get('/api/auth/callback', ...)
```

3. **Test HMAC validation:**
```typescript
// Add debug logging
console.log('Params:', req.query);
console.log('HMAC valid:', validateHmac(req.query, secret));
```

4. **Check ngrok for local development:**
```bash
# Start ngrok
ngrok http 3000

# Update Shopify app URL to ngrok URL
https://abc123.ngrok.io
```

---

### Issue: Session token validation fails

**Symptoms:**
- 401 Unauthorized
- "Invalid session token"
- Token expired

**Solutions:**

1. **Verify token expiry:**
```typescript
const decoded = jwt.decode(token);
console.log('Token expires:', new Date(decoded.exp * 1000));
console.log('Current time:', new Date());
```

2. **Check API secret:**
```typescript
// Must use SHOPIFY_API_SECRET (not API_KEY)
jwt.verify(token, process.env.SHOPIFY_API_SECRET);
```

3. **Verify shop domain:**
```typescript
if (decoded.dest !== `https://${shopDomain}`) {
  throw new Error('Shop domain mismatch');
}
```

---

### Issue: JWT refresh fails

**Symptoms:**
- Logged out after 15 minutes
- "Refresh token invalid"

**Solutions:**

1. **Check refresh token storage:**
```typescript
// Should be HTTP-only cookie
res.cookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

2. **Verify token rotation:**
```typescript
// Generate NEW refresh token on each refresh
const newRefreshToken = generateRefreshToken(user);
```

3. **Check database for stored tokens:**
```sql
SELECT * FROM refresh_tokens WHERE user_id = 'user_123';
```

---

## Database Issues

### Issue: Connection pool exhausted

**Symptoms:**
- "Too many connections" error
- Slow queries
- Timeout errors

**Solutions:**

1. **Increase pool size:**
```env
DATABASE_POOL_SIZE=50
```

```typescript
// Prisma configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  connection_limit: 50,
});
```

2. **Find long-running queries:**
```sql
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
ORDER BY duration DESC;
```

3. **Kill blocking queries:**
```sql
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE pid = 12345;
```

4. **Add connection timeout:**
```env
DATABASE_URL="postgresql://user:pass@host:5432/db?connect_timeout=10"
```

---

### Issue: Slow queries

**Symptoms:**
- API response >500ms
- Database CPU 100%
- Query timeout

**Solutions:**

1. **Enable query logging:**
```typescript
const prisma = new PrismaClient({
  log: ['query'],
});
```

2. **Analyze slow query:**
```sql
EXPLAIN ANALYZE
SELECT * FROM products
WHERE organization_id = 'org_123'
ORDER BY seo_score DESC;
```

3. **Add missing indexes:**
```sql
CREATE INDEX CONCURRENTLY idx_products_seo_score
ON products(organization_id, seo_score DESC);
```

4. **Optimize query:**
```typescript
// ❌ Bad: N+1 query
const products = await prisma.product.findMany();
for (const product of products) {
  product.keywords = await prisma.keyword.findMany({ where: { productId: product.id } });
}

// ✅ Good: Single query with include
const products = await prisma.product.findMany({
  include: { keywords: true },
});
```

---

### Issue: Database migration conflicts

**Symptoms:**
- Migration stuck "pending"
- "Migration already applied"
- Schema drift detected

**Solutions:**

1. **Check migration status:**
```bash
npx prisma migrate status
```

2. **Resolve applied migration:**
```bash
# Mark as applied (if already applied manually)
npx prisma migrate resolve --applied "20260119_migration_name"
```

3. **Resolve failed migration:**
```bash
# Mark as rolled back
npx prisma migrate resolve --rolled-back "20260119_migration_name"

# Fix migration SQL
# Re-run migration
npx prisma migrate dev
```

4. **Reset migration history (dev only):**
```bash
# ⚠️ Deletes all data
npx prisma migrate reset
```

---

## API Issues

### Issue: Rate limit exceeded

**Symptoms:**
- 429 Too Many Requests
- "Rate limit exceeded"
- X-RateLimit-Remaining: 0

**Solutions:**

1. **Check rate limit headers:**
```bash
curl -I https://api.shopify-seo.com/api/products
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 0
# X-RateLimit-Reset: 1642608000
```

2. **Implement exponential backoff:**
```typescript
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (error.status === 429) {
        const delay = Math.pow(2, i) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
}
```

3. **Upgrade plan (if needed):**
- Free: 60 req/min
- Starter: 100 req/min
- Professional: 300 req/min
- Enterprise: 1000 req/min

---

### Issue: Webhook not processing

**Symptoms:**
- Shopify sends webhook but nothing happens
- Webhook status: "not delivered"
- SQS queue depth increasing

**Solutions:**

1. **Verify webhook subscription:**
```bash
# Check subscriptions in Shopify
curl -X GET "https://${SHOP}.myshopify.com/admin/api/2026-01/webhooks.json" \
  -H "X-Shopify-Access-Token: ${ACCESS_TOKEN}"
```

2. **Check HMAC validation:**
```typescript
// Log HMAC validation
console.log('Received HMAC:', req.headers['x-shopify-hmac-sha256']);
console.log('Calculated HMAC:', calculateHmac(req.body));
```

3. **Check SQS queue:**
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.us-east-1.amazonaws.com/.../webhook-queue \
  --attribute-names ApproximateNumberOfMessages
```

4. **Manually trigger webhook processing:**
```bash
# View DLQ (Dead Letter Queue)
aws sqs receive-message \
  --queue-url https://sqs.us-east-1.amazonaws.com/.../webhook-dlq \
  --max-number-of-messages 10
```

---

### Issue: API returns 500 Internal Server Error

**Symptoms:**
- Unexpected 500 errors
- Sentry error reports
- CloudWatch error logs

**Solutions:**

1. **Check error logs:**
```bash
# CloudWatch
aws logs tail /ecs/shopify-seo-backend-production --follow --filter-pattern ERROR

# Local logs
npm run dev | grep ERROR
```

2. **Check Sentry:**
- Go to sentry.io dashboard
- View recent errors
- Check stack trace

3. **Add error handling:**
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  throw new HttpException('Operation failed', HttpStatus.INTERNAL_SERVER_ERROR);
}
```

4. **Enable debug logging:**
```env
LOG_LEVEL=debug
```

---

## AI Content Generation Issues

### Issue: OpenAI API timeout

**Symptoms:**
- Request takes >60 seconds
- "Request timeout" error
- No content generated

**Solutions:**

1. **Increase timeout:**
```typescript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000, // 120 seconds
});
```

2. **Check prompt length:**
```typescript
// Token limit: GPT-3.5 = 4096, GPT-4 = 8192
const tokenCount = estimateTokens(prompt);
console.log('Token count:', tokenCount);
```

3. **Use streaming response:**
```typescript
const stream = await openai.chat.completions.create({
  model: 'gpt-3.5-turbo',
  messages: [{ role: 'user', content: prompt }],
  stream: true,
});
```

4. **Check OpenAI status:**
- Visit: https://status.openai.com
- Check for outages

---

### Issue: Content quality score too low

**Symptoms:**
- All variants auto-rejected (score <70)
- Low readability score
- Low SEO score

**Solutions:**

1. **Debug quality scoring:**
```typescript
const score = await scoreContent(content, criteria);
console.log('Overall score:', score.overall);
console.log('Readability:', score.readability.score);
console.log('SEO:', score.seoOptimization.score);
console.log('Uniqueness:', score.uniqueness.score);
```

2. **Adjust prompt template:**
```typescript
// Add more specific instructions
template: `Generate SEO-optimized content...
- Include primary keyword naturally
- Use power words
- Keep sentences short (15-20 words)
- Include call-to-action
`;
```

3. **Try different AI model:**
```typescript
// GPT-4 generally produces higher quality
const result = await generateWithOpenAI(input, 'gpt-4-turbo');
```

4. **Lower auto-approve threshold (temporarily):**
```typescript
// Change from 85 to 80 for testing
if (score.overall >= 80) {
  recommendation = 'auto_approve';
}
```

---

### Issue: AI API rate limit exceeded

**Symptoms:**
- "Rate limit exceeded" from OpenAI/Anthropic
- 429 error from AI provider
- Content generation fails

**Solutions:**

1. **Implement request queue:**
```typescript
import { Queue } from 'bullmq';

const aiQueue = new Queue('ai-content-generation', {
  connection: redisConnection,
  limiter: {
    max: 50, // 50 requests
    duration: 60000, // per minute
  },
});
```

2. **Use different models:**
```typescript
// If GPT-4 rate limited, fall back to GPT-3.5
try {
  return await generateWithGPT4(prompt);
} catch (error) {
  if (error.code === 'rate_limit_exceeded') {
    return await generateWithGPT35(prompt);
  }
  throw error;
}
```

3. **Batch requests:**
```typescript
// Generate multiple products in single request
const prompt = `Generate meta titles for these products:\n${products.map(p => p.title).join('\n')}`;
```

---

## Performance Issues

### Issue: High API latency (>500ms)

**Symptoms:**
- Slow page loads
- CloudWatch P95 latency >500ms
- User complaints

**Solutions:**

1. **Identify slow endpoints:**
```bash
# DataDog APM
# Navigate to APM → Services → shopify-seo-backend → Endpoints
# Sort by P95 latency
```

2. **Add caching:**
```typescript
import { Cache } from '@nestjs/cache-manager';

@Get('products')
@UseCache({ ttl: 300 }) // 5 minutes
async getProducts() {
  return this.productService.findAll();
}
```

3. **Optimize database queries:**
```typescript
// Add indexes
CREATE INDEX idx_products_org_score ON products(organization_id, seo_score DESC);

// Use pagination
const products = await prisma.product.findMany({
  take: 20,
  skip: page * 20,
});
```

4. **Enable CDN for static assets:**
```typescript
// Serve static files from CloudFront
<img src="https://cdn.shopify-seo.com/images/logo.png" />
```

---

### Issue: High memory usage

**Symptoms:**
- ECS task OOMKilled
- Memory >90%
- Application crashes

**Solutions:**

1. **Check memory metrics:**
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=shopify-seo-backend \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average
```

2. **Increase task memory:**
```json
// ecs-task-definition.json
{
  "memory": "2048",  // Increase from 1024 to 2048 MB
  "cpu": "1024"
}
```

3. **Find memory leaks:**
```bash
# Use Node.js heap dump
node --inspect dist/main.js

# Chrome DevTools → Memory → Take heap snapshot
```

4. **Optimize large data processing:**
```typescript
// ❌ Bad: Load all products into memory
const products = await prisma.product.findMany();

// ✅ Good: Stream/paginate
for await (const batch of getProductBatches()) {
  await processProducts(batch);
}
```

---

## Deployment Issues

### Issue: ECS task won't start

**Symptoms:**
- Task status: "STOPPED"
- Task definition revision not updating
- Health check failing

**Solutions:**

1. **Check task logs:**
```bash
aws logs tail /ecs/shopify-seo-backend-production --follow
```

2. **Verify task definition:**
```bash
aws ecs describe-task-definition \
  --task-definition shopify-seo-backend-production:latest
```

3. **Check environment variables:**
```bash
# View secrets in Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id shopify-seo/production/env
```

4. **Test image locally:**
```bash
docker pull ACCOUNT_ID.dkr.ecr.us-east-1.amazonaws.com/shopify-seo-backend:latest
docker run -p 3000:3000 shopify-seo-backend:latest
curl http://localhost:3000/health
```

---

### Issue: Deployment rollback needed

**Symptoms:**
- New deployment causes errors
- High error rate after deployment
- Circuit breaker triggered

**Solutions:**

1. **Automatic rollback (Circuit Breaker):**
```hcl
# ECS automatically rolls back if deployment fails
deployment_circuit_breaker {
  enable   = true
  rollback = true
}
```

2. **Manual rollback:**
```bash
# List task definitions
aws ecs list-task-definitions --family-prefix shopify-seo-backend

# Update service to previous revision
aws ecs update-service \
  --cluster shopify-seo-production \
  --service shopify-seo-backend \
  --task-definition shopify-seo-backend:PREVIOUS_REVISION
```

3. **Database rollback (if migration applied):**
```bash
# Restore from snapshot
aws rds restore-db-cluster-to-point-in-time \
  --db-cluster-identifier shopify-seo-restored \
  --source-db-cluster-identifier shopify-seo-production \
  --restore-to-time "2026-01-19T10:00:00Z"
```

---

## Monitoring & Debugging

### CloudWatch Logs

```bash
# Tail logs
aws logs tail /ecs/shopify-seo-backend-production --follow

# Filter for errors
aws logs tail /ecs/shopify-seo-backend-production --follow --filter-pattern ERROR

# Search logs
aws logs filter-log-events \
  --log-group-name /ecs/shopify-seo-backend-production \
  --filter-pattern "timeout"
```

### DataDog APM

**View traces:**
1. Go to DataDog → APM → Traces
2. Filter by service: `shopify-seo-backend`
3. Search for slow/failed requests

**Create custom metrics:**
```typescript
import { StatsD } from 'hot-shots';

const statsd = new StatsD();

// Increment counter
statsd.increment('content.generated');

// Record timing
statsd.timing('content.generation.duration', duration);

// Set gauge
statsd.gauge('products.count', productCount);
```

### Sentry Error Tracking

**View errors:**
1. Go to sentry.io
2. Select project: `shopify-seo-platform`
3. View errors by frequency

**Add context:**
```typescript
import * as Sentry from '@sentry/node';

Sentry.setContext('product', {
  id: product.id,
  title: product.title,
});

Sentry.captureException(error);
```

---

## Error Codes Reference

| Error Code | HTTP Status | Description | Solution |
|-----------|-------------|-------------|----------|
| `INVALID_REQUEST` | 400 | Invalid request parameters | Check request body/query params |
| `UNAUTHORIZED` | 401 | Missing/invalid authentication | Provide valid access token |
| `FORBIDDEN` | 403 | Insufficient permissions | Check user role/permissions |
| `NOT_FOUND` | 404 | Resource not found | Verify resource ID exists |
| `CONFLICT` | 409 | Resource conflict | Check for duplicates |
| `VALIDATION_ERROR` | 422 | Validation failed | Fix validation errors in request |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Wait and retry with backoff |
| `INTERNAL_SERVER_ERROR` | 500 | Server error | Check logs, contact support |
| `SERVICE_UNAVAILABLE` | 503 | Temporary outage | Retry after delay |

---

## Getting Help

### Self-Service

1. **Search this guide** for common issues
2. **Check CloudWatch logs** for error messages
3. **Review Sentry** for stack traces
4. **Check DataDog** for performance metrics

### Support Channels

1. **GitHub Issues:** https://github.com/your-org/shopify-seo-platform/issues
2. **Email Support:** support@shopify-seo.com
3. **Slack:** #shopify-seo-support (for team members)
4. **Status Page:** https://status.shopify-seo.com

### Emergency Contact

**On-Call Engineer:**
- PagerDuty: +1-555-ONCALL
- Email: oncall@shopify-seo.com

**Escalation:**
- CTO: cto@shopify-seo.com
- CEO: ceo@shopify-seo.com

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Next Review:** 2026-02-19
