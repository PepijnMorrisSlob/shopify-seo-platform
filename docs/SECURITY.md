# Shopify SEO Automation Platform - Security Documentation

**Version:** 1.0
**Last Updated:** 2026-01-19
**Classification:** Confidential

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Encryption](#data-encryption)
4. [API Security](#api-security)
5. [Infrastructure Security](#infrastructure-security)
6. [OWASP Top 10 Mitigation](#owasp-top-10-mitigation)
7. [Security Monitoring](#security-monitoring)
8. [Incident Response](#incident-response)
9. [Security Checklist](#security-checklist)
10. [Compliance](#compliance)

---

## Security Overview

### Security Principles

1. **Defense in Depth:** Multiple security layers
2. **Least Privilege:** Minimal access permissions
3. **Secure by Default:** Security enabled out of the box
4. **Zero Trust:** Verify everything, trust nothing
5. **Encryption Everywhere:** Data encrypted in transit and at rest

### Security Certifications & Compliance

- **GDPR Compliant** (EU data protection)
- **CCPA Compliant** (California privacy)
- **SOC 2 Type I** (In progress)
- **OWASP ASVS Level 2** (Application Security Verification Standard)

---

## Authentication & Authorization

### OAuth 2.0 (Shopify App Installation)

#### Flow Security

1. **HMAC Validation:** All OAuth requests validated with HMAC-SHA256
2. **State Parameter:** CSRF protection via nonce
3. **PKCE Support:** Proof Key for Code Exchange
4. **Scope Validation:** Only request necessary permissions

```typescript
// HMAC Validation
import crypto from 'crypto';

function validateHmac(params: Record<string, string>, secret: string): boolean {
  const { hmac, ...rest } = params;

  const message = Object.keys(rest)
    .sort()
    .map((key) => `${key}=${rest[key]}`)
    .join('&');

  const hash = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');

  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}
```

### Session Management

#### App Bridge Session Tokens

- **Short-lived:** 15 minute expiry
- **JWT-based:** Signed by Shopify
- **Shop-scoped:** Tied to specific shop domain

```typescript
// Session Token Validation
import jwt from 'jsonwebtoken';

function validateSessionToken(token: string): boolean {
  try {
    const decoded = jwt.verify(token, process.env.SHOPIFY_API_SECRET, {
      algorithms: ['HS256'],
    });

    // Verify shop domain
    if (decoded.dest !== `https://${expectedShopDomain}`) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
}
```

#### JWT Access Tokens (API)

- **Algorithm:** RS256 (asymmetric)
- **Expiry:** 15 minutes
- **Refresh Tokens:** 7 days (HTTP-only cookie)
- **Token Rotation:** New refresh token on each refresh

```typescript
// JWT Generation
import jwt from 'jsonwebtoken';

function generateAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, privateKey, {
    algorithm: 'RS256',
    expiresIn: '15m',
    issuer: 'shopify-seo-platform',
    audience: 'api',
  });
}
```

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|------------|
| **Owner** | Full access (billing, settings, users, content) |
| **Admin** | All except billing & user management |
| **Member** | Read-only access to content & analytics |

```typescript
// RBAC Guard
import { CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class RequireRole implements CanActivate {
  constructor(private requiredRole: 'owner' | 'admin' | 'member') {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const roleHierarchy = { owner: 3, admin: 2, member: 1 };

    return roleHierarchy[user.role] >= roleHierarchy[this.requiredRole];
  }
}
```

---

## Data Encryption

### Encryption at Rest

#### Database Encryption (RDS Aurora)

- **AES-256 encryption** for all data at rest
- **AWS KMS** for key management
- **Automated key rotation** (90 days)

#### Access Token Encryption

```typescript
// AES-256-GCM encryption for Shopify access tokens
import crypto from 'crypto';

function encryptAccessToken(token: string, key: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);

  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

function decryptAccessToken(encrypted: string, iv: string, tag: string, key: string): string {
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(key, 'hex'),
    Buffer.from(iv, 'hex')
  );

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

#### S3 Encryption

- **SSE-S3:** Server-side encryption for content storage
- **Bucket policies:** Enforce encryption in transit

### Encryption in Transit

#### TLS 1.3

- **All connections:** HTTPS only
- **Certificate:** Automated renewal via AWS ACM
- **Cipher suites:** Strong ciphers only (TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256)

```nginx
# NGINX TLS Configuration
ssl_protocols TLSv1.3;
ssl_ciphers 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256';
ssl_prefer_server_ciphers off;
ssl_session_cache shared:SSL:10m;
ssl_session_timeout 10m;
```

---

## API Security

### Rate Limiting

```typescript
// Rate Limiter Middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded. Retry after 60 seconds.',
        retryAfter: 60,
      },
    });
  },
});
```

**Rate Limits:**
- **Free Plan:** 60 req/min, 1,000 req/hour
- **Starter:** 100 req/min, 5,000 req/hour
- **Professional:** 300 req/min, 15,000 req/hour
- **Enterprise:** 1,000 req/min, 50,000 req/hour

### Input Validation

```typescript
// Input Sanitization
import { IsString, IsEmail, MaxLength, IsEnum } from 'class-validator';
import { sanitizeHtml } from '../utils/sanitize';

class CreateProductDto {
  @IsString()
  @MaxLength(255)
  title: string;

  @IsString()
  @MaxLength(5000)
  description: string;

  @IsEnum(['active', 'draft', 'archived'])
  status: string;
}

// Sanitize HTML input
function sanitizeInput(input: string): string {
  return sanitizeHtml(input, {
    allowedTags: [],
    allowedAttributes: {},
  });
}
```

### SQL Injection Prevention

```typescript
// Prisma automatically parameterizes queries
const products = await prisma.product.findMany({
  where: {
    organizationId: organizationId, // Parameterized
    title: {
      contains: searchTerm, // Parameterized
    },
  },
});

// ❌ NEVER do this:
// const products = await prisma.$queryRaw(`SELECT * FROM products WHERE title = '${searchTerm}'`);
```

### XSS Protection

```typescript
// Content Security Policy (CSP)
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "cdn.shopify.com"],
    styleSrc: ["'self'", "'unsafe-inline'", "cdn.shopify.com"],
    imgSrc: ["'self'", "data:", "https:", "cdn.shopify.com"],
    connectSrc: ["'self'", "api.shopify-seo.com"],
    fontSrc: ["'self'", "fonts.googleapis.com"],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: [],
  },
}));

// Sanitize output in frontend
import DOMPurify from 'dompurify';

function SafeHTML({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}
```

### CSRF Protection

```typescript
// CSRF Token Middleware
import csrf from 'csurf';

const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
  },
});

app.use(csrfProtection);

// Add CSRF token to forms
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});
```

---

## Infrastructure Security

### Network Security

#### VPC Configuration

- **Private subnets:** Database & cache in private subnets
- **NAT Gateway:** Outbound internet access for private subnets
- **Security Groups:** Whitelist-based firewall rules

```hcl
# Security Group Rules
resource "aws_security_group_rule" "allow_https" {
  type              = "ingress"
  from_port         = 443
  to_port           = 443
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.alb.id
}

resource "aws_security_group_rule" "allow_postgres" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.ecs_tasks.id
  security_group_id        = aws_security_group.database.id
}
```

#### AWS WAF (Web Application Firewall)

```hcl
# WAF Rules
resource "aws_wafv2_web_acl" "main" {
  name  = "shopify-seo-waf"
  scope = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "RateLimitRule"
    priority = 1
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    action {
      block {}
    }
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 2
    statement {
      managed_rule_group_statement {
        vendor_name = "AWS"
        name        = "AWSManagedRulesCommonRuleSet"
      }
    }
  }
}
```

### Secrets Management

#### AWS Secrets Manager

```typescript
// Fetch secrets at runtime
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const client = new SecretsManager({ region: 'us-east-1' });

async function getSecret(secretName: string): Promise<string> {
  const response = await client.getSecretValue({ SecretId: secretName });
  return response.SecretString;
}

// Usage
const dbPassword = await getSecret('shopify-seo/production/db-password');
```

**Never commit secrets to Git:**
- Use `.env` files (gitignored)
- Use AWS Secrets Manager for production
- Rotate secrets quarterly

### Container Security

- **Image scanning:** AWS ECR scans for vulnerabilities
- **Minimal base images:** Use Alpine or distroless images
- **Non-root user:** Run containers as non-root
- **Read-only filesystem:** Where possible

```dockerfile
# Secure Dockerfile
FROM node:20-alpine AS builder

# Run as non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

USER nodejs

COPY --chown=nodejs:nodejs . .
RUN npm ci --only=production

FROM node:20-alpine
USER nodejs
COPY --from=builder --chown=nodejs:nodejs /app /app

CMD ["node", "dist/main.js"]
```

---

## OWASP Top 10 Mitigation

| OWASP Risk | Mitigation |
|-----------|-----------|
| **A01: Broken Access Control** | RBAC, JWT tokens, session validation |
| **A02: Cryptographic Failures** | AES-256, TLS 1.3, secure key storage |
| **A03: Injection** | Parameterized queries (Prisma), input validation |
| **A04: Insecure Design** | Security reviews, threat modeling |
| **A05: Security Misconfiguration** | Security headers, CSP, HSTS |
| **A06: Vulnerable Components** | Dependabot, npm audit, quarterly updates |
| **A07: Authentication Failures** | OAuth 2.0, MFA support, rate limiting |
| **A08: Software & Data Integrity** | Code signing, SRI for CDN assets |
| **A09: Security Logging Failures** | Audit logs, CloudWatch, DataDog |
| **A10: SSRF** | URL validation, allowlist for external requests |

---

## Security Monitoring

### Audit Logging

```typescript
// Audit Log Service
@Injectable()
export class AuditLogService {
  async log(event: AuditEvent) {
    await prisma.auditLog.create({
      data: {
        organizationId: event.organizationId,
        userId: event.userId,
        action: event.action,
        resource: event.resource,
        resourceId: event.resourceId,
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        metadata: event.metadata,
        timestamp: new Date(),
      },
    });
  }
}

// Log all sensitive operations
await auditLog.log({
  organizationId: 'org_123',
  userId: 'user_456',
  action: 'DELETE',
  resource: 'product',
  resourceId: 'prod_789',
  ipAddress: req.ip,
  userAgent: req.headers['user-agent'],
});
```

### Security Alerts

**CloudWatch Alarms:**
- Failed authentication attempts >10 in 5 minutes
- Unusual API traffic patterns
- Database connection failures
- Unauthorized access attempts

**DataDog APM:**
- Error rate spike (>1%)
- Slow query detection (>1 second)
- Memory leak detection
- Anomaly detection (ML-based)

---

## Incident Response

### Incident Response Plan

#### 1. Detection & Triage (0-15 minutes)

- **Alert received** via PagerDuty/Slack
- **On-call engineer** investigates
- **Severity assessment:**
  - **Critical:** Data breach, complete outage
  - **High:** Partial outage, security vulnerability
  - **Medium:** Performance degradation
  - **Low:** Minor issue

#### 2. Containment (15-60 minutes)

- **Isolate affected systems**
- **Disable compromised credentials**
- **Block malicious IPs** (AWS WAF)
- **Take snapshots** (database, logs)

#### 3. Investigation (1-24 hours)

- **Analyze logs** (CloudWatch, DataDog, Sentry)
- **Identify root cause**
- **Document timeline**
- **Preserve evidence**

#### 4. Remediation (24-72 hours)

- **Apply patches**
- **Rotate credentials**
- **Update firewall rules**
- **Deploy fixes**

#### 5. Recovery (72+ hours)

- **Restore services**
- **Verify integrity**
- **Monitor closely**
- **Update runbooks**

#### 6. Post-Incident Review

- **Incident report** (what, when, why, how)
- **Root cause analysis**
- **Action items** (prevent recurrence)
- **Update security policies**

### Data Breach Notification

**GDPR Requirement:** Notify within 72 hours

1. **Notify DPA** (Data Protection Authority)
2. **Notify affected users** via email
3. **Post status page update**
4. **Provide breach details:**
   - Nature of breach
   - Affected data
   - Mitigation steps
   - Contact information

---

## Security Checklist

### Pre-Production

- [ ] All secrets in Secrets Manager (not .env)
- [ ] Database encryption enabled (RDS)
- [ ] TLS 1.3 enforced (ALB)
- [ ] WAF enabled and configured
- [ ] Rate limiting active
- [ ] CSRF protection enabled
- [ ] CSP headers configured
- [ ] Input validation on all endpoints
- [ ] Audit logging enabled
- [ ] Security scanning (OWASP ZAP)
- [ ] Dependency audit (npm audit, Snyk)
- [ ] Penetration testing completed
- [ ] Incident response plan documented
- [ ] Backup strategy tested

### Quarterly Reviews

- [ ] Rotate all secrets
- [ ] Update dependencies
- [ ] Review access permissions
- [ ] Audit user accounts
- [ ] Review CloudWatch alarms
- [ ] Test disaster recovery
- [ ] Security training for team
- [ ] Review incident logs

---

## Compliance

### GDPR Compliance

- **Data encryption** (transit & rest)
- **Right to access** (data export API)
- **Right to erasure** (data deletion API)
- **Data breach notification** (72 hours)
- **Data Processing Agreement** (with Shopify)
- **Privacy Policy** (publicly accessible)

### SOC 2 Type I

- **Access controls** (RBAC)
- **Change management** (Git workflow, PR reviews)
- **Incident response** (documented procedures)
- **Monitoring** (CloudWatch, DataDog)
- **Backup & DR** (automated backups, tested recovery)

---

**Document Version:** 1.0
**Last Reviewed:** 2026-01-19
**Next Review:** 2026-04-19 (Quarterly)
**Contact:** security@shopify-seo.com
