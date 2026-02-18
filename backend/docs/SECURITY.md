# Security Architecture Documentation
**Shopify SEO Automation Platform - Security Module**

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Authorization (RBAC)](#authorization-rbac)
4. [Encryption](#encryption)
5. [GDPR Compliance](#gdpr-compliance)
6. [Rate Limiting](#rate-limiting)
7. [Security Best Practices](#security-best-practices)
8. [Threat Protection](#threat-protection)
9. [Audit Logging](#audit-logging)
10. [Incident Response](#incident-response)

---

## Overview

The Shopify SEO platform implements enterprise-grade security with multiple layers of protection:

- **OAuth 2.0** for Shopify app installation
- **Session tokens** for embedded app authentication (App Bridge)
- **AES-256-GCM** encryption for sensitive data
- **Role-Based Access Control (RBAC)** for authorization
- **Rate limiting** to prevent abuse
- **GDPR compliance** for data privacy
- **HMAC validation** for all webhooks and OAuth callbacks
- **Comprehensive audit logging** for security events

---

## Authentication

### Shopify OAuth 2.0 Installation Flow

The platform uses OAuth 2.0 to install the app on Shopify stores:

```typescript
// Step 1: Generate OAuth URL
const authUrl = await authService.generateOAuthUrl(shop);
// Redirect merchant to: https://example.myshopify.com/admin/oauth/authorize?...

// Step 2: Validate callback
const validation = await authService.validateCallback(query);
if (!validation.valid) {
  throw new Error(validation.reason);
}

// Step 3: Exchange code for token
const accessToken = await authService.exchangeCodeForToken(shop, code);

// Step 4: Store encrypted token
await authService.storeAccessToken(shop, accessToken);
```

**Security Features:**
- ✅ HMAC validation on all callbacks
- ✅ State parameter (CSRF protection)
- ✅ Timestamp validation (prevents replay attacks)
- ✅ Shop domain validation (*.myshopify.com)
- ✅ Nonce tracking
- ✅ Access tokens stored encrypted (AES-256-GCM)

### Shopify App Bridge Session Tokens

For embedded apps, we use session tokens from Shopify App Bridge:

```typescript
// Frontend (React)
const sessionToken = await getSessionToken(app);

// Send token in Authorization header
const response = await fetch('/api/products', {
  headers: {
    'Authorization': `Bearer ${sessionToken}`,
  },
});

// Backend validates token
const session = await validateSessionToken(token);
// Returns: { shop, userId, sessionId }
```

**Security Features:**
- ✅ JWT with RS256 signature verification
- ✅ Public key fetched from Shopify (cached 1 hour)
- ✅ Audience validation (must match our API key)
- ✅ Expiration check (tokens expire after 1 minute)
- ✅ Shop domain extracted from 'dest' claim (not trusted from client)

### JWT Tokens (Internal)

For internal authentication (non-embedded contexts), we use our own JWT tokens:

```typescript
// Generate token pair
const tokens = await authService.generateJWT(
  userId,
  organizationId,
  email,
  role
);

// Returns:
// {
//   accessToken: 'eyJ...' (15 minutes),
//   refreshToken: 'eyJ...' (7 days),
//   expiresIn: 900
// }

// Refresh token
const newTokens = await authService.refreshJWT(refreshToken);
```

**Security Features:**
- ✅ Short-lived access tokens (15 minutes)
- ✅ Longer refresh tokens (7 days)
- ✅ Token version tracking (invalidate on password change)
- ✅ HS256 signature with secret key

---

## Authorization (RBAC)

### Role Hierarchy

Three roles with different permission levels:

1. **Owner**
   - Full access to all resources
   - Can manage billing
   - Can delete organization
   - Can assign roles

2. **Admin**
   - Manage products and content
   - View analytics
   - Cannot manage billing or delete org

3. **Member**
   - Create and view own content
   - View products and analytics
   - Read-only access to settings

### Permission Model

Permissions are resource-based and action-based:

```typescript
// Check permission
const hasPermission = await rbacService.hasPermission(
  userId,
  'products', // resource
  'create'    // action
);

// Require permission (throws if denied)
await rbacService.requirePermission(userId, 'products', 'delete');
```

**Available Resources:**
- `products` - Product management
- `content` - Content generation
- `analytics` - Analytics data
- `settings` - Organization settings
- `users` - User management
- `billing` - Billing and subscriptions
- `integrations` - External API integrations

**Available Actions:**
- `create` - Create new resource
- `read` - View resource
- `update` - Modify resource
- `delete` - Delete resource

### NestJS Guards

Protect routes with decorators:

```typescript
// Require authentication
@UseGuards(ShopifyAuthGuard)
@Get('products')
async getProducts() { ... }

// Require permission
@UseGuards(ShopifyAuthGuard, RBACGuard)
@RequirePermission({ resource: 'products', action: 'create' })
@Post('products')
async createProduct() { ... }

// Require specific role
@UseGuards(ShopifyAuthGuard, RBACGuard)
@RequireRole(UserRole.OWNER)
@Delete('organization')
async deleteOrganization() { ... }

// Require plan tier
@UseGuards(ShopifyAuthGuard, RequirePlanTier('professional'))
@Post('bulk-generate')
async bulkGenerate() { ... }
```

---

## Encryption

### Access Token Encryption

Shopify access tokens are encrypted before storage:

```typescript
// Encrypt
const encrypted = encryptionService.encryptAccessToken(token);
// Returns: { encryptedText, iv, authTag }

// Store in database
await prisma.organization.update({
  where: { id },
  data: {
    accessToken: encrypted.encryptedText,
    accessTokenIv: encrypted.iv,
    accessTokenAuthTag: encrypted.authTag,
  },
});

// Decrypt when needed
const token = encryptionService.decryptAccessToken(encrypted);
```

**Algorithm:** AES-256-GCM
- ✅ Authenticated encryption (prevents tampering)
- ✅ Unique IV per encryption
- ✅ Authentication tag verification
- ✅ 256-bit key from environment variable

### Password Hashing

User passwords hashed with bcrypt:

```typescript
// Hash password
const hash = await encryptionService.hashPassword(password);

// Verify password
const isValid = await encryptionService.verifyPassword(password, hash);
```

**Parameters:**
- Algorithm: bcrypt
- Salt rounds: 12
- One-way hashing (cannot decrypt)

### HMAC Validation

All Shopify requests validated:

```typescript
// OAuth callback
const result = HMACValidator.validateOAuthCallback(query, apiSecret);

// Webhook
const result = HMACValidator.validateWebhook(body, hmacHeader, apiSecret);
```

**Security:**
- ✅ SHA-256 HMAC
- ✅ Timing-safe comparison
- ✅ Validates all params except 'hmac' and 'signature'
- ✅ Alphabetically sorted parameters

### Environment Variables

**Required encryption keys:**

```bash
# 32-byte hex string (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=<64-character-hex-string>

# JWT secret (generate with: openssl rand -hex 64)
JWT_SECRET=<128-character-hex-string>

# Shopify credentials
SHOPIFY_API_KEY=<from-shopify-partners>
SHOPIFY_API_SECRET=<from-shopify-partners>
```

---

## GDPR Compliance

### Right to Access (Data Export)

Users can export all their data:

```typescript
const dataExport = await gdprService.exportUserData(userId, 'json');

// Returns:
// {
//   userId,
//   requestedAt,
//   data: {
//     profile: { ... },
//     organizations: [ ... ],
//     products: [ ... ],
//     contentGenerations: [ ... ],
//     analytics: { ... },
//     auditLogs: [ ... ],
//     consents: [ ... ]
//   },
//   format: 'json'
// }
```

**Features:**
- ✅ Complete data export within 30 days
- ✅ JSON or CSV format
- ✅ Includes all personal data
- ✅ Excludes sensitive credentials
- ✅ Downloadable link (S3)

### Right to Erasure (Data Deletion)

Users can request data deletion:

```typescript
await gdprService.deleteUserData(userId, 'user_request');
```

**Deletion Strategy:**
- **Personal data:** Deleted immediately
- **Business records:** Anonymized (replaced with hash)
- **Audit logs:** Anonymized but retained for compliance
- **Access tokens:** Deleted
- **30-day grace period** before permanent deletion

**Protection:**
- ✅ Cannot delete sole owner (must assign another owner)
- ✅ Cascade delete related data
- ✅ Anonymize instead of delete where required
- ✅ Audit trail maintained

### Consent Management

Track user consent for data processing:

```typescript
// Record consent
await gdprService.recordConsent(
  userId,
  ConsentType.DATA_PROCESSING,
  true,  // granted
  ipAddress,
  '1.0'  // privacy policy version
);

// Check consent
const hasConsent = await gdprService.hasConsent(
  userId,
  ConsentType.ANALYTICS_TRACKING
);

// Revoke consent
await gdprService.revokeConsent(
  userId,
  ConsentType.MARKETING_EMAILS,
  ipAddress
);
```

**Consent Types:**
- `DATA_PROCESSING` - Required for account
- `ANALYTICS_TRACKING` - Optional analytics
- `MARKETING_EMAILS` - Marketing communications
- `THIRD_PARTY_SHARING` - Sharing with partners

### Data Breach Notification

Must notify within 72 hours:

```typescript
await gdprService.notifyDataBreach(
  affectedUserIds,
  {
    description: 'Database exposure due to misconfiguration',
    dataTypes: ['email', 'name'],
    discoveredAt: new Date(),
    severity: 'high'
  }
);
```

---

## Rate Limiting

### Plan-Based Limits

Different limits per plan tier:

| Plan         | Requests/Min | Requests/Day |
|--------------|--------------|--------------|
| Free         | 60           | 5,000        |
| Starter      | 300          | 50,000       |
| Professional | 1,000        | 200,000      |
| Enterprise   | 5,000        | 1,000,000    |

### Implementation

```typescript
// Apply to all routes
app.use(rateLimiterMiddleware);

// Custom limit for specific endpoint
app.post(
  '/api/content/bulk-generate',
  customRateLimiter(10, 60000), // 10 requests/minute
  handler
);

// IP-based limiting (public endpoints)
app.post(
  '/api/auth/login',
  ipRateLimiter(5, 300000), // 5 attempts per 5 minutes
  handler
);
```

### Response Headers

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 42
X-RateLimit-Reset: 1640000000
Retry-After: 30
```

### Algorithm

**Sliding Window** for accurate limiting:
- Uses Redis sorted sets
- Removes expired entries
- Handles distributed systems
- No burst allowances

---

## Security Best Practices

### Input Validation

All inputs validated before processing:

```typescript
// Validate shop domain
if (!HMACValidator.isValidShopDomain(shop)) {
  throw new Error('Invalid shop domain');
}

// Validate timestamp
if (!HMACValidator.isTimestampValid(timestamp, 300)) {
  throw new Error('Timestamp expired');
}
```

### Output Encoding

Prevent XSS attacks:
- ✅ JSON responses properly escaped
- ✅ HTML content sanitized
- ✅ CSP headers set

### SQL Injection Prevention

Using Prisma ORM:
- ✅ Parameterized queries
- ✅ Type-safe queries
- ✅ No raw SQL (unless necessary)

### CSRF Protection

Multiple layers:
- ✅ State parameter in OAuth flow
- ✅ Session token validation
- ✅ HMAC verification
- ✅ SameSite cookies

### Security Headers

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});
```

---

## Threat Protection

### Brute Force Protection

- IP-based rate limiting on login
- Account lockout after 5 failed attempts
- CAPTCHA after 3 failures
- Exponential backoff

### DDoS Protection

- CloudFlare WAF
- Rate limiting per organization
- Request size limits
- Timeout on long requests

### Injection Attacks

- Parameterized queries (Prisma)
- Input validation
- Output encoding
- Content Security Policy

### Session Hijacking

- Short token expiration
- Secure cookies (HttpOnly, SameSite)
- Token rotation
- Device fingerprinting

---

## Audit Logging

All security events logged:

```typescript
{
  type: SecurityEventType.LOGIN_SUCCESS,
  userId: '123',
  organizationId: '456',
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  timestamp: '2026-01-19T10:00:00Z',
  metadata: { ... },
  severity: 'low'
}
```

**Event Types:**
- Authentication events (login, logout, token refresh)
- Authorization events (permission denied, role changed)
- OAuth events (install, callback, HMAC failure)
- Data access (export, delete, sensitive access)
- Security events (rate limit, invalid token, breach)

**Retention:**
- Security logs: 1 year
- Audit logs: 7 years (compliance)
- Access logs: 90 days

---

## Incident Response

### Security Incident Severity

1. **Critical** - Data breach, system compromise
   - Response time: Immediate
   - Notification: Within 1 hour

2. **High** - Unauthorized access attempt, vulnerability
   - Response time: < 4 hours
   - Notification: Within 24 hours

3. **Medium** - Permission denial, rate limit exceeded
   - Response time: < 24 hours
   - Notification: Not required

4. **Low** - Normal security events
   - Response time: Best effort
   - Notification: Not required

### Incident Response Plan

1. **Detection**
   - Monitor security logs
   - Automated alerts
   - User reports

2. **Containment**
   - Isolate affected systems
   - Revoke compromised tokens
   - Block malicious IPs

3. **Investigation**
   - Review audit logs
   - Identify root cause
   - Assess impact

4. **Notification**
   - Notify affected users (GDPR: 72 hours)
   - Inform supervisory authority
   - Public disclosure if required

5. **Recovery**
   - Restore from backups
   - Patch vulnerabilities
   - Rotate encryption keys

6. **Post-Mortem**
   - Document incident
   - Update procedures
   - Implement preventions

---

## Security Checklist

### Pre-Production

- [ ] All environment variables set (encryption keys, secrets)
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] HMAC validation on all Shopify requests
- [ ] Access tokens encrypted in database
- [ ] RBAC guards on protected routes
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled
- [ ] Error messages don't leak sensitive info
- [ ] Dependencies scanned for vulnerabilities
- [ ] Penetration testing completed
- [ ] GDPR compliance verified
- [ ] Incident response plan documented

### Ongoing

- [ ] Security logs monitored daily
- [ ] Encryption keys rotated annually
- [ ] Dependency updates monthly
- [ ] Penetration testing quarterly
- [ ] Security training for team
- [ ] Backup encryption verified
- [ ] Access reviews quarterly
- [ ] Incident response drills

---

## Contact

For security issues or questions:
- **Email:** security@yourplatform.com
- **Report vulnerability:** security@yourplatform.com (PGP key available)
- **Bug bounty:** https://bugcrowd.com/yourplatform

**DO NOT** disclose security vulnerabilities publicly before coordinated disclosure.

---

**Last Updated:** 2026-01-19
**Version:** 1.0
**Review Frequency:** Quarterly
