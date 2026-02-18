# Shopify SEO Automation Platform - GDPR Compliance

**Version:** 1.0
**Last Updated:** 2026-01-19
**Effective Date:** 2026-01-15

---

## Table of Contents

1. [Overview](#overview)
2. [Data We Collect](#data-we-collect)
3. [Legal Basis for Processing](#legal-basis-for-processing)
4. [Data Subject Rights](#data-subject-rights)
5. [Data Processing Agreement](#data-processing-agreement)
6. [Data Security](#data-security)
7. [Data Retention](#data-retention)
8. [Cross-Border Data Transfers](#cross-border-data-transfers)
9. [Breach Notification](#breach-notification)
10. [Implementation Guide](#implementation-guide)

---

## Overview

The Shopify SEO Automation Platform is **fully GDPR compliant** and respects the privacy rights of all European Union (EU) data subjects.

**GDPR Regulation:** Regulation (EU) 2016/679

### Key Principles

1. **Lawfulness, Fairness, Transparency:** Clear privacy policies
2. **Purpose Limitation:** Data used only for stated purposes
3. **Data Minimization:** Collect only necessary data
4. **Accuracy:** Keep data up-to-date
5. **Storage Limitation:** Retain data only as long as needed
6. **Integrity & Confidentiality:** Secure data processing
7. **Accountability:** Demonstrate compliance

---

## Data We Collect

### Personal Data

| Data Type | Purpose | Legal Basis | Retention |
|-----------|---------|-------------|-----------|
| **Email Address** | Account creation, notifications | Consent, Contract | Account lifetime |
| **Name** | Account personalization | Consent | Account lifetime |
| **Shop Domain** | Shopify integration | Contract | Account lifetime |
| **IP Address** | Security, fraud prevention | Legitimate Interest | 90 days |
| **Usage Data** | Analytics, product improvement | Legitimate Interest | 2 years |
| **Product Data** | SEO optimization services | Contract | Account lifetime |
| **Content Generation History** | Service delivery | Contract | Account lifetime |
| **Payment Information** | Billing (via Shopify) | Contract | Per Shopify policy |

### Special Categories of Data

**We do NOT collect:**
- Racial or ethnic origin
- Political opinions
- Religious or philosophical beliefs
- Trade union membership
- Genetic data
- Biometric data
- Health data
- Sex life or sexual orientation data

---

## Legal Basis for Processing

### 1. Consent (Article 6(1)(a))

**Examples:**
- Email marketing communications
- Analytics cookies (non-essential)

**Consent Mechanism:**
```typescript
// Consent Management
interface ConsentPreferences {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
}

async function saveConsent(userId: string, preferences: ConsentPreferences) {
  await prisma.userConsent.upsert({
    where: { userId },
    update: {
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      functional: preferences.functional,
      consentedAt: new Date(),
    },
    create: {
      userId,
      ...preferences,
      consentedAt: new Date(),
    },
  });
}
```

### 2. Contract (Article 6(1)(b))

**Examples:**
- Processing product data for SEO optimization
- Generating AI content
- Publishing content to Shopify

### 3. Legitimate Interest (Article 6(1)(f))

**Examples:**
- Fraud detection and prevention
- Security monitoring
- Service improvement analytics

**Legitimate Interest Assessment (LIA):**
- **Purpose:** Prevent fraud and ensure security
- **Necessity:** Essential for platform integrity
- **Balancing Test:** Security outweighs minimal privacy impact
- **Safeguards:** Data minimization, anonymization where possible

---

## Data Subject Rights

### 1. Right to Access (Article 15)

**Request:** "What personal data do you have about me?"

**Implementation:**
```http
GET /api/gdpr/data-export
Authorization: Bearer {token}
```

**Response:** JSON file containing all personal data

```typescript
// Data Export Service
async function exportUserData(userId: string): Promise<DataExport> {
  return {
    personalInfo: await prisma.user.findUnique({ where: { id: userId } }),
    products: await prisma.product.findMany({ where: { userId } }),
    contentGeneration: await prisma.contentGeneration.findMany({ where: { userId } }),
    auditLogs: await prisma.auditLog.findMany({ where: { userId } }),
    consentRecords: await prisma.userConsent.findMany({ where: { userId } }),
  };
}
```

**Timeline:** Response within **30 days** (extendable to 60 days if complex)

---

### 2. Right to Rectification (Article 16)

**Request:** "Update my incorrect email address"

**Implementation:**
```http
PUT /api/users/me
Authorization: Bearer {token}

{
  "email": "corrected@example.com"
}
```

**Timeline:** Updated immediately

---

### 3. Right to Erasure (Article 17) - "Right to be Forgotten"

**Request:** "Delete all my personal data"

**Implementation:**
```http
DELETE /api/gdpr/delete-account
Authorization: Bearer {token}
```

```typescript
// Account Deletion Service
async function deleteUserAccount(userId: string) {
  // 1. Anonymize audit logs (retain for legal compliance)
  await prisma.auditLog.updateMany({
    where: { userId },
    data: { userId: 'ANONYMIZED', email: 'anonymized@deleted.user' },
  });

  // 2. Delete personal data
  await prisma.contentGeneration.deleteMany({ where: { userId } });
  await prisma.product.deleteMany({ where: { userId } });
  await prisma.userConsent.deleteMany({ where: { userId } });

  // 3. Delete user account
  await prisma.user.delete({ where: { id: userId } });

  // 4. Revoke Shopify access token
  await shopifyService.revokeAccessToken(userId);

  // 5. Notify user via email
  await emailService.send({
    to: user.email,
    subject: 'Account Deletion Confirmation',
    template: 'account-deleted',
  });
}
```

**Timeline:** Deleted within **30 days**

**Exceptions:** Data retained for legal obligations (e.g., accounting records for 7 years)

---

### 4. Right to Restriction (Article 18)

**Request:** "Temporarily stop processing my data while you verify its accuracy"

**Implementation:**
```http
POST /api/gdpr/restrict-processing
Authorization: Bearer {token}

{
  "reason": "accuracy_dispute"
}
```

```typescript
// Restrict Processing
await prisma.user.update({
  where: { id: userId },
  data: {
    processingRestricted: true,
    restrictionReason: 'accuracy_dispute',
    restrictedAt: new Date(),
  },
});
```

---

### 5. Right to Data Portability (Article 20)

**Request:** "Export my data in a machine-readable format"

**Implementation:**
```http
GET /api/gdpr/data-export?format=json
Authorization: Bearer {token}
```

**Formats supported:**
- JSON (default)
- CSV
- XML

```typescript
// Data Portability
async function exportPortableData(userId: string, format: 'json' | 'csv' | 'xml') {
  const data = await exportUserData(userId);

  if (format === 'csv') {
    return convertToCSV(data);
  } else if (format === 'xml') {
    return convertToXML(data);
  }

  return data; // JSON
}
```

---

### 6. Right to Object (Article 21)

**Request:** "I object to direct marketing"

**Implementation:**
```http
POST /api/gdpr/object-processing
Authorization: Bearer {token}

{
  "processingType": "marketing"
}
```

```typescript
// Object to Processing
await prisma.userConsent.update({
  where: { userId },
  data: {
    marketing: false,
    marketingOptOutDate: new Date(),
  },
});
```

---

### 7. Automated Decision-Making (Article 22)

**We do NOT use automated decision-making** that produces legal or similarly significant effects.

**AI Content Generation:**
- User reviews and approves all AI-generated content
- No automatic publishing without user consent
- Users can always reject AI suggestions

---

## Data Processing Agreement (DPA)

### Our Role

**We are a Data Processor** on behalf of Shopify merchants (Data Controllers).

### Sub-Processors

| Sub-Processor | Service | Location | DPA |
|--------------|---------|----------|-----|
| AWS | Infrastructure hosting | US (us-east-1) | ✅ |
| OpenAI | AI content generation | US | ✅ |
| Anthropic | AI content generation | US | ✅ |
| Perplexity | Research & facts | US | ✅ |
| DataDog | Monitoring | US | ✅ |
| Sentry | Error tracking | US | ✅ |

### DPA Template

Available at: `https://shopify-seo.com/dpa`

**Key Terms:**
- Data processing instructions
- Confidentiality obligations
- Security measures (SOC 2, ISO 27001)
- Sub-processor notification (30 days)
- Data breach notification (72 hours)
- Auditing rights
- Data deletion on termination

---

## Data Security

### Technical Measures

1. **Encryption:**
   - **At rest:** AES-256 (RDS, S3)
   - **In transit:** TLS 1.3

2. **Access Controls:**
   - Role-Based Access Control (RBAC)
   - Multi-Factor Authentication (MFA) for admin accounts
   - Principle of Least Privilege

3. **Monitoring:**
   - 24/7 security monitoring (DataDog, CloudWatch)
   - Automated threat detection
   - Audit logging (all data access logged)

4. **Infrastructure:**
   - AWS VPC with private subnets
   - AWS WAF (Web Application Firewall)
   - DDoS protection (AWS Shield)

### Organizational Measures

1. **Staff Training:**
   - Annual GDPR training
   - Security awareness training

2. **Background Checks:**
   - All employees undergo background checks

3. **Confidentiality Agreements:**
   - All staff sign NDAs

4. **Incident Response Plan:**
   - Documented procedures
   - Quarterly drills

---

## Data Retention

| Data Type | Retention Period | Deletion Method |
|-----------|------------------|-----------------|
| **User Account Data** | Until account deletion | Hard delete |
| **Product Data** | Until account deletion | Hard delete |
| **Content Generation** | Until account deletion | Hard delete |
| **Audit Logs** | 7 years (legal requirement) | Anonymized after 1 year |
| **Usage Analytics** | 2 years | Aggregated & anonymized |
| **Backup Data** | 30 days | Auto-deleted (AWS lifecycle) |

```typescript
// Automated Data Retention
@Cron('0 0 * * *') // Daily at midnight
async function enforceDataRetention() {
  // Delete accounts marked for deletion 30+ days ago
  await prisma.user.deleteMany({
    where: {
      deletionRequestedAt: {
        lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
  });

  // Anonymize old audit logs (1+ year old)
  await prisma.auditLog.updateMany({
    where: {
      createdAt: {
        lte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
      },
      anonymized: false,
    },
    data: {
      userId: 'ANONYMIZED',
      email: 'anonymized@deleted.user',
      ipAddress: '0.0.0.0',
      anonymized: true,
    },
  });
}
```

---

## Cross-Border Data Transfers

### Standard Contractual Clauses (SCCs)

**EU to US transfers** use European Commission-approved Standard Contractual Clauses (SCCs).

**Safeguards:**
- AWS data centers in EU (option to choose Frankfurt region)
- SCCs with all US-based sub-processors
- Encryption in transit and at rest
- Regular security audits

### Data Residency Options

**EU customers can choose:**
- **EU-only hosting:** Data stored in AWS Frankfurt (eu-central-1)
- **US hosting:** Default (us-east-1) with SCCs

---

## Breach Notification

### Detection

**Automated monitoring:**
- Unauthorized access attempts
- Data exfiltration patterns
- Database anomalies
- Failed authentication spikes

### Notification Timeline

**GDPR Requirement:** Notify DPA within **72 hours**

**Process:**
1. **Detect breach** (automated alerts)
2. **Assess severity** (within 1 hour)
3. **Contain breach** (within 4 hours)
4. **Notify DPA** (within 72 hours)
5. **Notify users** (if high risk to rights & freedoms)
6. **Post-incident review**

### Notification Template

**To Data Protection Authority:**
```
Subject: Personal Data Breach Notification

We are writing to notify you of a personal data breach affecting [X] data subjects.

1. Nature of breach: [Description]
2. Data affected: [Email addresses, names, etc.]
3. Date of breach: [YYYY-MM-DD HH:MM UTC]
4. Date discovered: [YYYY-MM-DD HH:MM UTC]
5. Individuals affected: [Number]
6. Potential consequences: [Description]
7. Measures taken: [Containment actions]
8. Measures to mitigate: [Prevention actions]

Contact: dpo@shopify-seo.com
```

**To Affected Users:**
```
Subject: Security Incident Notification

We are writing to inform you of a security incident that may have affected your personal data.

What happened: [Description]
What data was affected: [Specific data types]
What we're doing: [Mitigation steps]
What you should do: [User actions, if any]

For questions, contact: support@shopify-seo.com
```

---

## Implementation Guide

### For Developers

#### 1. Add Consent Banner

```tsx
// ConsentBanner.tsx
import { useState } from 'react';

export function ConsentBanner() {
  const [visible, setVisible] = useState(true);

  const acceptAll = async () => {
    await saveConsent({ analytics: true, marketing: true, functional: true });
    setVisible(false);
  };

  return visible ? (
    <div className="consent-banner">
      <p>We use cookies to improve your experience. See our Privacy Policy.</p>
      <button onClick={acceptAll}>Accept All</button>
      <button onClick={() => setVisible(false)}>Reject</button>
    </div>
  ) : null;
}
```

#### 2. Implement Data Export API

```typescript
// gdpr.controller.ts
@Controller('api/gdpr')
export class GDPRController {
  @Get('data-export')
  @UseGuards(AuthGuard)
  async exportData(@Req() req) {
    const data = await this.gdprService.exportUserData(req.user.id);
    return data;
  }

  @Delete('delete-account')
  @UseGuards(AuthGuard)
  async deleteAccount(@Req() req) {
    await this.gdprService.deleteUserAccount(req.user.id);
    return { success: true };
  }
}
```

#### 3. Add Privacy Policy Link

```tsx
// Footer.tsx
export function Footer() {
  return (
    <footer>
      <a href="/privacy-policy">Privacy Policy</a>
      <a href="/gdpr">GDPR Information</a>
      <a href="/cookie-policy">Cookie Policy</a>
    </footer>
  );
}
```

---

## Contact Information

**Data Protection Officer (DPO):**
- Email: dpo@shopify-seo.com
- Address: [Your address]

**Data Subject Requests:**
- Email: privacy@shopify-seo.com
- Response time: 30 days (max 60 days if complex)

**Supervisory Authority (Example - Ireland):**
- Data Protection Commission (DPC)
- Website: dataprotection.ie
- Email: info@dataprotection.ie

---

**Document Version:** 1.0
**Last Updated:** 2026-01-19
**Next Review:** 2026-07-19 (Semi-annual)
