/**
 * Security Configuration Types
 * Shopify SEO Automation Platform
 *
 * Additional security-related type definitions
 */

/**
 * Security Headers Configuration
 */
export interface SecurityHeadersConfig {
  contentSecurityPolicy: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    connectSrc: string[];
    frameSrc: string[];
    frameAncestors: string[];
  };
  strictTransportSecurity: {
    maxAge: number;
    includeSubDomains: boolean;
    preload: boolean;
  };
  xFrameOptions: 'DENY' | 'SAMEORIGIN' | 'ALLOW-FROM';
  xContentTypeOptions: 'nosniff';
  xXssProtection: '1; mode=block';
  referrerPolicy:
    | 'no-referrer'
    | 'no-referrer-when-downgrade'
    | 'origin'
    | 'origin-when-cross-origin'
    | 'same-origin'
    | 'strict-origin'
    | 'strict-origin-when-cross-origin';
}

/**
 * Input Validation Types
 */
export interface ValidationRule {
  field: string;
  type: 'string' | 'number' | 'boolean' | 'email' | 'url' | 'shopifyDomain';
  required: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  customValidator?: (value: any) => boolean;
}

/**
 * API Key Types
 */
export interface APIKey {
  id: string;
  organizationId: string;
  name: string;
  key: string; // Hashed version
  keyPrefix: string; // First 8 characters (for identification)
  createdAt: Date;
  expiresAt?: Date;
  lastUsedAt?: Date;
  revokedAt?: Date;
  permissions: string[];
}

/**
 * IP Whitelist Types
 */
export interface IPWhitelistEntry {
  organizationId: string;
  ipAddress: string;
  cidrRange?: string;
  description: string;
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Two-Factor Authentication Types
 */
export interface TwoFactorAuth {
  userId: string;
  enabled: boolean;
  secret: string; // Encrypted TOTP secret
  backupCodes: string[]; // Encrypted backup codes
  verifiedAt?: Date;
}

export interface TwoFactorVerification {
  userId: string;
  code: string;
  timestamp: Date;
  valid: boolean;
}

/**
 * Password Policy Types
 */
export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge?: number; // Days before password expires
  preventReuse: number; // Number of previous passwords to check
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  preventReuse: 5,
};

/**
 * Security Audit Types
 */
export interface SecurityAudit {
  id: string;
  organizationId: string;
  performedAt: Date;
  performedBy: string;
  auditType: 'manual' | 'automated' | 'external';
  findings: SecurityFinding[];
  score: number; // 0-100
  status: 'pass' | 'fail' | 'warning';
}

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category:
    | 'authentication'
    | 'authorization'
    | 'encryption'
    | 'input_validation'
    | 'configuration'
    | 'dependency';
  title: string;
  description: string;
  recommendation: string;
  cvssScore?: number; // CVSS score (0-10)
  cweId?: string; // CWE ID (e.g., 'CWE-79')
  owaspCategory?: string; // OWASP Top 10 category
}

/**
 * Threat Detection Types
 */
export enum ThreatType {
  BRUTE_FORCE = 'brute_force',
  SQL_INJECTION = 'sql_injection',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTACK = 'csrf_attack',
  CREDENTIAL_STUFFING = 'credential_stuffing',
  DDoS = 'ddos',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  DATA_EXFILTRATION = 'data_exfiltration',
  SUSPICIOUS_GEOLOCATION = 'suspicious_geolocation',
}

export interface ThreatEvent {
  id: string;
  type: ThreatType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: {
    ipAddress: string;
    userAgent?: string;
    userId?: string;
    geolocation?: {
      country: string;
      city: string;
      latitude: number;
      longitude: number;
    };
  };
  detectedAt: Date;
  blocked: boolean;
  metadata: Record<string, any>;
}

/**
 * Compliance Types
 */
export interface ComplianceReport {
  organizationId: string;
  framework: 'GDPR' | 'SOC2' | 'ISO27001' | 'PCI_DSS' | 'HIPAA';
  generatedAt: Date;
  status: 'compliant' | 'non_compliant' | 'partial';
  controls: ComplianceControl[];
  score: number; // 0-100
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  implemented: boolean;
  evidence?: string;
  lastVerified?: Date;
}

/**
 * Vulnerability Scanning Types
 */
export interface VulnerabilityScan {
  id: string;
  organizationId: string;
  scanType: 'infrastructure' | 'application' | 'dependencies';
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  vulnerabilities: Vulnerability[];
}

export interface Vulnerability {
  id: string;
  cveId?: string; // CVE identifier
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedComponent: string;
  version: string;
  fixedVersion?: string;
  exploitAvailable: boolean;
  cvssScore: number;
  publishedAt?: Date;
}

/**
 * Encryption Key Management Types
 */
export interface EncryptionKey {
  id: string;
  algorithm: 'AES-256' | 'RSA-2048' | 'RSA-4096';
  purpose: 'data_encryption' | 'token_signing' | 'api_encryption';
  keyMaterial: string; // Encrypted key material
  createdAt: Date;
  rotatedAt?: Date;
  expiresAt?: Date;
  status: 'active' | 'rotating' | 'deprecated' | 'revoked';
}

export interface KeyRotationPolicy {
  rotationInterval: number; // Days
  autoRotate: boolean;
  gracePeriod: number; // Days to keep old key active
  notifyBeforeRotation: number; // Days
}

/**
 * Session Management Types
 */
export interface SessionConfig {
  sessionTimeout: number; // Minutes
  absoluteTimeout: number; // Minutes (max session duration)
  renewBeforeExpiry: number; // Minutes
  maxConcurrentSessions: number;
  requireReauthForSensitiveOperations: boolean;
}

export interface ActiveSession {
  id: string;
  userId: string;
  organizationId: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  deviceId?: string;
}

/**
 * Security Metrics Types
 */
export interface SecurityMetrics {
  organizationId: string;
  period: {
    start: Date;
    end: Date;
  };
  metrics: {
    totalRequests: number;
    failedAuthAttempts: number;
    rateLimitExceeded: number;
    suspiciousActivities: number;
    blockedThreats: number;
    dataExportRequests: number;
    dataDeletionRequests: number;
    averageResponseTime: number;
    uptimePercentage: number;
  };
  trends: {
    metric: string;
    change: number; // Percentage change from previous period
    trend: 'up' | 'down' | 'stable';
  }[];
}
