// =====================================
// Sentry Configuration
// =====================================
// Error tracking and performance monitoring
// configuration for Shopify SEO Platform
// =====================================

const Sentry = require('@sentry/node');
const { ProfilingIntegration } = require('@sentry/profiling-node');

/**
 * Initialize Sentry for backend (NestJS)
 */
function initSentryBackend(app) {
  if (!process.env.SENTRY_DSN) {
    console.warn('SENTRY_DSN not configured, skipping Sentry initialization');
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    release: process.env.DD_VERSION || 'unknown',

    // Performance Monitoring
    tracesSampleRate: getTracesSampleRate(),
    profilesSampleRate: getProfilesSampleRate(),

    // Integrations
    integrations: [
      // Automatic instrumentation
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({ app }),
      new Sentry.Integrations.Postgres(),
      new Sentry.Integrations.Redis(),

      // Performance profiling
      new ProfilingIntegration(),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out health check errors
      if (event.request && event.request.url && event.request.url.includes('/health')) {
        return null;
      }

      // Filter out 404 errors
      if (event.exception && event.exception.values) {
        const firstException = event.exception.values[0];
        if (firstException && firstException.value && firstException.value.includes('404')) {
          return null;
        }
      }

      // Scrub sensitive data
      if (event.request && event.request.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      return event;
    },

    // Context
    initialScope: {
      tags: {
        service: 'shopify-seo-backend',
        team: 'engineering',
      },
      user: {
        ip_address: '{{auto}}',
      },
    },

    // Ignore specific errors
    ignoreErrors: [
      // Browser errors that leak into backend logs
      'Non-Error promise rejection captured',
      'ResizeObserver loop limit exceeded',

      // Network errors
      'NetworkError',
      'ECONNRESET',
      'ETIMEDOUT',

      // Client-side errors
      'AbortError',
    ],

    // Ignore transactions
    ignoreTransactions: [
      '/health',
      '/metrics',
      '/favicon.ico',
    ],

    // Debug mode
    debug: process.env.NODE_ENV === 'development',

    // Attach stack traces
    attachStacktrace: true,

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Auto session tracking
    autoSessionTracking: true,

    // Send default PII (set to false for GDPR compliance)
    sendDefaultPii: false,
  });

  console.log('Sentry initialized for backend');
}

/**
 * Initialize Sentry for frontend (React)
 */
function getSentryFrontendConfig() {
  return {
    dsn: process.env.VITE_SENTRY_DSN,
    environment: process.env.VITE_ENVIRONMENT || 'development',
    release: process.env.VITE_VERSION || 'unknown',

    // Performance Monitoring
    tracesSampleRate: getTracesSampleRate(),
    replaysSessionSampleRate: 0.1, // 10% of sessions
    replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

    // Integrations
    integrations: [
      // Automatically instrument React
      // new Sentry.BrowserTracing({
      //   routingInstrumentation: Sentry.reactRouterV6Instrumentation(
      //     React.useEffect,
      //     useLocation,
      //     useNavigationType,
      //     createRoutesFromChildren,
      //     matchRoutes
      //   ),
      // }),

      // Session replay for debugging
      // new Sentry.Replay({
      //   maskAllText: true,
      //   blockAllMedia: true,
      // }),
    ],

    // Error filtering
    beforeSend(event, hint) {
      // Filter out development errors
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Error:', hint.originalException || hint.syntheticException);
        return null;
      }

      // Filter out browser extension errors
      if (event.exception && event.exception.values) {
        const error = event.exception.values[0];
        if (error.value && (
          error.value.includes('chrome-extension://') ||
          error.value.includes('moz-extension://')
        )) {
          return null;
        }
      }

      return event;
    },

    // Ignore specific errors
    ignoreErrors: [
      // Random plugins/extensions
      'top.GLOBALS',
      'originalCreateNotification',
      'canvas.contentDocument',
      'MyApp_RemoveAllHighlights',
      'http://tt.epicplay.com',
      'Can\'t find variable: ZiteReader',
      'jigsaw is not defined',
      'ComboSearch is not defined',
      'http://loading.retry.widdit.com/',
      'atomicFindClose',

      // Facebook errors
      'fb_xd_fragment',

      // Network errors
      'NetworkError',
      'Failed to fetch',
      'Load failed',

      // ResizeObserver
      'ResizeObserver loop limit exceeded',
    ],

    // Denylist URLs
    denyUrls: [
      // Browser extensions
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,

      // Third-party scripts
      /graph\.facebook\.com/i,
      /connect\.facebook\.net/i,
      /googletagmanager\.com/i,
    ],

    // Context
    initialScope: {
      tags: {
        service: 'shopify-seo-frontend',
        team: 'engineering',
      },
    },
  };
}

/**
 * Get traces sample rate based on environment
 */
function getTracesSampleRate() {
  const env = process.env.NODE_ENV || process.env.VITE_ENVIRONMENT;

  switch (env) {
    case 'production':
      return 0.1; // 10% in production
    case 'staging':
      return 0.5; // 50% in staging
    default:
      return 1.0; // 100% in development
  }
}

/**
 * Get profiles sample rate based on environment
 */
function getProfilesSampleRate() {
  const env = process.env.NODE_ENV || process.env.VITE_ENVIRONMENT;

  switch (env) {
    case 'production':
      return 0.1; // 10% in production
    case 'staging':
      return 0.5; // 50% in staging
    default:
      return 1.0; // 100% in development
  }
}

/**
 * Capture custom business metrics
 */
function captureBusinessMetric(metricName, value, tags = {}) {
  Sentry.metrics.gauge(metricName, value, {
    tags: {
      ...tags,
      environment: process.env.NODE_ENV,
    },
  });
}

/**
 * Capture custom business events
 */
function captureBusinessEvent(eventName, data = {}) {
  Sentry.captureEvent({
    message: eventName,
    level: 'info',
    tags: {
      type: 'business_event',
      event: eventName,
    },
    extra: data,
  });
}

/**
 * Set user context (call after authentication)
 */
function setUserContext(user) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
    organization_id: user.organizationId,
  });
}

/**
 * Clear user context (call after logout)
 */
function clearUserContext() {
  Sentry.setUser(null);
}

/**
 * Add breadcrumb for debugging
 */
function addBreadcrumb(message, data = {}, level = 'info') {
  Sentry.addBreadcrumb({
    message,
    level,
    data,
    timestamp: Date.now() / 1000,
  });
}

/**
 * Capture exception with additional context
 */
function captureException(error, context = {}) {
  Sentry.captureException(error, {
    contexts: {
      custom: context,
    },
  });
}

/**
 * Start a new transaction for performance monitoring
 */
function startTransaction(name, op = 'http.server') {
  return Sentry.startTransaction({
    name,
    op,
    data: {
      timestamp: Date.now(),
    },
  });
}

module.exports = {
  initSentryBackend,
  getSentryFrontendConfig,
  captureBusinessMetric,
  captureBusinessEvent,
  setUserContext,
  clearUserContext,
  addBreadcrumb,
  captureException,
  startTransaction,
};
