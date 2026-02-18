/**
 * Authentication Type Definitions
 * Shopify SEO Automation Platform - Security Module
 *
 * Defines all authentication, authorization, and session-related types
 */

/**
 * Shopify OAuth 2.0 Types
 */
export interface ShopifyOAuthCallbackQuery {
  code: string;
  hmac: string;
  shop: string;
  state: string;
  timestamp: string;
  host?: string;
}

export interface ShopifyAccessTokenResponse {
  access_token: string;
  scope: string;
}

export interface ShopifyOAuthConfig {
  apiKey: string;
  apiSecret: string;
  scopes: string[];
  redirectUri: string;
}

/**
 * Shopify App Bridge Session Token Types
 */
export interface SessionTokenPayload {
  iss: string; // Issuer (https://[shop].myshopify.com/admin)
  dest: string; // Destination (https://[shop].myshopify.com)
  aud: string; // Audience (Shopify API key)
  sub: string; // Subject (user ID)
  exp: number; // Expiration timestamp
  nbf: number; // Not before timestamp
  iat: number; // Issued at timestamp
  jti: string; // JWT ID
  sid: string; // Session ID
}

export interface SessionContext {
  shop: string; // Shopify shop domain (extracted from dest)
  userId: string; // Shopify user ID
  sessionId: string;
  isOnlineToken: boolean;
}

/**
 * JWT Token Types (for our own authentication)
 */
export interface JWTPayload {
  userId: string;
  organizationId: string;
  email: string;
  role: UserRole;
  iat: number; // Issued at
  exp: number; // Expiration
}

export interface JWTTokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshTokenPayload {
  userId: string;
  organizationId: string;
  tokenVersion: number; // For token invalidation
  iat: number;
  exp: number;
}

/**
 * User Roles (RBAC)
 */
export enum UserRole {
  OWNER = 'owner', // Full access, can delete organization
  ADMIN = 'admin', // Manage products, content, view analytics
  MEMBER = 'member', // Create content, view analytics (read-only)
}

/**
 * Permission Types
 */
export type ResourceType =
  | 'products'
  | 'content'
  | 'analytics'
  | 'settings'
  | 'users'
  | 'billing'
  | 'integrations';

export type ActionType = 'create' | 'read' | 'update' | 'delete';

export interface Permission {
  resource: ResourceType;
  action: ActionType;
}

/**
 * Role Permissions Mapping
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    // Owner has all permissions
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update' },
    { resource: 'products', action: 'delete' },
    { resource: 'content', action: 'create' },
    { resource: 'content', action: 'read' },
    { resource: 'content', action: 'update' },
    { resource: 'content', action: 'delete' },
    { resource: 'analytics', action: 'read' },
    { resource: 'settings', action: 'create' },
    { resource: 'settings', action: 'read' },
    { resource: 'settings', action: 'update' },
    { resource: 'settings', action: 'delete' },
    { resource: 'users', action: 'create' },
    { resource: 'users', action: 'read' },
    { resource: 'users', action: 'update' },
    { resource: 'users', action: 'delete' },
    { resource: 'billing', action: 'read' },
    { resource: 'billing', action: 'update' },
    { resource: 'integrations', action: 'create' },
    { resource: 'integrations', action: 'read' },
    { resource: 'integrations', action: 'update' },
    { resource: 'integrations', action: 'delete' },
  ],
  [UserRole.ADMIN]: [
    { resource: 'products', action: 'create' },
    { resource: 'products', action: 'read' },
    { resource: 'products', action: 'update' },
    { resource: 'products', action: 'delete' },
    { resource: 'content', action: 'create' },
    { resource: 'content', action: 'read' },
    { resource: 'content', action: 'update' },
    { resource: 'content', action: 'delete' },
    { resource: 'analytics', action: 'read' },
    { resource: 'settings', action: 'read' },
    { resource: 'users', action: 'read' },
    { resource: 'integrations', action: 'read' },
  ],
  [UserRole.MEMBER]: [
    { resource: 'products', action: 'read' },
    { resource: 'content', action: 'create' },
    { resource: 'content', action: 'read' },
    { resource: 'analytics', action: 'read' },
  ],
};

/**
 * Authenticated Request (extends Express Request)
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  organizationId: string;
  role: UserRole;
  shopDomain: string; // Shopify shop domain
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
  organization: {
    id: string;
    shopDomain: string;
    planTier: string;
    accessToken: string; // Decrypted Shopify access token
  };
}

/**
 * Encryption Types
 */
export interface EncryptedData {
  encryptedText: string;
  iv: string; // Initialization vector
  authTag?: string; // Authentication tag (for GCM mode)
}

export interface EncryptionConfig {
  algorithm: string; // 'aes-256-cbc' or 'aes-256-gcm'
  key: Buffer; // 32 bytes for AES-256
  keyDerivation: {
    method: 'pbkdf2' | 'scrypt';
    iterations: number;
    salt: string;
  };
}

/**
 * Security Event Types (for audit logging)
 */
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  TOKEN_REFRESH = 'auth.token.refresh',
  TOKEN_EXPIRED = 'auth.token.expired',

  // Authorization events
  PERMISSION_DENIED = 'authz.permission.denied',
  ROLE_CHANGED = 'authz.role.changed',

  // OAuth events
  OAUTH_INSTALL_START = 'oauth.install.start',
  OAUTH_INSTALL_SUCCESS = 'oauth.install.success',
  OAUTH_INSTALL_FAILURE = 'oauth.install.failure',
  OAUTH_CALLBACK_INVALID_HMAC = 'oauth.callback.invalid_hmac',

  // Data access events
  DATA_EXPORT = 'data.export',
  DATA_DELETE = 'data.delete',
  DATA_DELETION = 'data.deletion',
  DATA_BREACH = 'data.breach',
  DELETION_SCHEDULED = 'data.deletion.scheduled',
  DELETION_CANCELLED = 'data.deletion.cancelled',
  SENSITIVE_DATA_ACCESS = 'data.sensitive.access',

  // Consent events
  CONSENT_RECORDED = 'consent.recorded',
  CONSENT_REVOKED = 'consent.revoked',

  // Security events
  RATE_LIMIT_EXCEEDED = 'security.rate_limit.exceeded',
  INVALID_SESSION_TOKEN = 'security.session_token.invalid',
  ENCRYPTION_KEY_ROTATION = 'security.encryption.key_rotation',
  SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
}

export interface SecurityEvent {
  type: SecurityEventType;
  userId?: string;
  organizationId?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata: Record<string, any>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * HMAC Validation Types
 */
export interface HMACValidationResult {
  valid: boolean;
  reason?: string; // If invalid, why?
}

export interface ShopifyWebhookHeaders {
  'x-shopify-topic': string;
  'x-shopify-hmac-sha256': string;
  'x-shopify-shop-domain': string;
  'x-shopify-webhook-id': string;
  'x-shopify-api-version': string;
  'x-shopify-triggered-at': string;
}

/**
 * Rate Limiting Types
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export const PLAN_RATE_LIMITS: Record<string, RateLimitConfig> = {
  free: {
    windowMs: 60000, // 1 minute
    maxRequests: 60, // 60 requests/minute
  },
  starter: {
    windowMs: 60000,
    maxRequests: 300, // 300 requests/minute
  },
  professional: {
    windowMs: 60000,
    maxRequests: 1000, // 1000 requests/minute
  },
  enterprise: {
    windowMs: 60000,
    maxRequests: 5000, // 5000 requests/minute
  },
};

/**
 * GDPR Consent Types
 */
export enum ConsentType {
  DATA_PROCESSING = 'data_processing',
  ANALYTICS_TRACKING = 'analytics_tracking',
  MARKETING_EMAILS = 'marketing_emails',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export interface UserConsent {
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  timestamp: Date;
  ipAddress: string;
  version: string; // Privacy policy version
}

/**
 * Data Export Types (GDPR Right to Access)
 */
export interface UserDataExport {
  userId: string;
  requestedAt: Date;
  completedAt?: Date;
  data: {
    profile: any;
    organizations: any[];
    products: any[];
    contentGenerations: any[];
    analytics: any[];
    auditLogs: any[];
  };
  format: 'json' | 'csv';
  downloadUrl?: string;
}

/**
 * Nonce for Replay Attack Prevention
 */
export interface NonceRecord {
  nonce: string;
  expiresAt: Date;
  used: boolean;
}
