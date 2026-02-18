/**
 * API Cost Tracker
 *
 * Centralized cost tracking for all external API services
 *
 * Features:
 * - Track costs per service (DataForSEO, Perplexity, etc.)
 * - Track costs per organization
 * - Monthly cost summaries
 * - Cost alerts when limits exceeded
 * - Export cost reports
 */

export interface APIServiceCost {
  service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console';
  operation: string;
  cost: number;
  timestamp: Date;
  organizationId?: string;
  metadata?: Record<string, any>;
}

export interface CostSummary {
  service: string;
  totalCost: number;
  operationCount: number;
  avgCostPerOperation: number;
  operations: {
    [key: string]: {
      count: number;
      totalCost: number;
    };
  };
}

export interface OrganizationCostSummary {
  organizationId: string;
  totalCost: number;
  services: {
    [service: string]: CostSummary;
  };
  period: {
    start: Date;
    end: Date;
  };
}

export class APICostTracker {
  private costs: APIServiceCost[] = [];
  private costLimits: Map<string, number> = new Map();

  constructor() {
    // Set default monthly cost limits (can be overridden)
    this.costLimits.set('dataforseo', 100); // $100/month
    this.costLimits.set('perplexity', 50); // $50/month
    this.costLimits.set('semrush', 100); // $100/month
  }

  /**
   * Track a single API cost
   */
  track(cost: APIServiceCost): void {
    this.costs.push(cost);

    // Check if cost limit exceeded
    const monthCost = this.getMonthlyCost(cost.service, cost.organizationId);
    const limit = this.costLimits.get(cost.service);

    if (limit && monthCost > limit) {
      console.warn(
        `⚠️  [CostTracker] ${cost.service} monthly cost ($${monthCost.toFixed(2)}) exceeded limit ($${limit})`
      );
    }
  }

  /**
   * Track DataForSEO cost
   */
  trackDataForSEO(
    operation: string,
    cost: number,
    organizationId?: string,
    metadata?: Record<string, any>
  ): void {
    this.track({
      service: 'dataforseo',
      operation,
      cost,
      timestamp: new Date(),
      organizationId,
      metadata,
    });
  }

  /**
   * Track Perplexity cost
   */
  trackPerplexity(
    operation: string,
    cost: number,
    organizationId?: string,
    metadata?: {
      model?: string;
      tokens?: number;
    }
  ): void {
    this.track({
      service: 'perplexity',
      operation,
      cost,
      timestamp: new Date(),
      organizationId,
      metadata,
    });
  }

  /**
   * Get total cost for a service
   */
  getTotalCost(
    service?: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    organizationId?: string
  ): number {
    let filteredCosts = this.costs;

    if (service) {
      filteredCosts = filteredCosts.filter((c) => c.service === service);
    }

    if (organizationId) {
      filteredCosts = filteredCosts.filter((c) => c.organizationId === organizationId);
    }

    return filteredCosts.reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get monthly cost for a service
   */
  getMonthlyCost(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    organizationId?: string
  ): number {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let filteredCosts = this.costs.filter(
      (c) => c.service === service && c.timestamp >= monthStart
    );

    if (organizationId) {
      filteredCosts = filteredCosts.filter((c) => c.organizationId === organizationId);
    }

    return filteredCosts.reduce((sum, c) => sum + c.cost, 0);
  }

  /**
   * Get cost summary for a service
   */
  getCostSummary(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    organizationId?: string
  ): CostSummary {
    let filteredCosts = this.costs.filter((c) => c.service === service);

    if (organizationId) {
      filteredCosts = filteredCosts.filter((c) => c.organizationId === organizationId);
    }

    const totalCost = filteredCosts.reduce((sum, c) => sum + c.cost, 0);
    const operationCount = filteredCosts.length;

    const operations: { [key: string]: { count: number; totalCost: number } } = {};

    for (const cost of filteredCosts) {
      if (!operations[cost.operation]) {
        operations[cost.operation] = { count: 0, totalCost: 0 };
      }
      operations[cost.operation].count++;
      operations[cost.operation].totalCost += cost.cost;
    }

    return {
      service,
      totalCost,
      operationCount,
      avgCostPerOperation: operationCount > 0 ? totalCost / operationCount : 0,
      operations,
    };
  }

  /**
   * Get organization cost summary
   */
  getOrganizationCostSummary(
    organizationId: string,
    startDate?: Date,
    endDate?: Date
  ): OrganizationCostSummary {
    const start = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const end = endDate || new Date();

    let filteredCosts = this.costs.filter(
      (c) =>
        c.organizationId === organizationId &&
        c.timestamp >= start &&
        c.timestamp <= end
    );

    const totalCost = filteredCosts.reduce((sum, c) => sum + c.cost, 0);

    const services: { [service: string]: CostSummary } = {};

    const uniqueServices = [...new Set(filteredCosts.map((c) => c.service))];

    for (const service of uniqueServices) {
      services[service] = this.getCostSummary(service as any, organizationId);
    }

    return {
      organizationId,
      totalCost,
      services,
      period: { start, end },
    };
  }

  /**
   * Set cost limit for a service
   */
  setCostLimit(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    limit: number
  ): void {
    this.costLimits.set(service, limit);
  }

  /**
   * Get cost limit for a service
   */
  getCostLimit(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console'
  ): number | undefined {
    return this.costLimits.get(service);
  }

  /**
   * Check if cost limit exceeded
   */
  isCostLimitExceeded(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    organizationId?: string
  ): boolean {
    const monthCost = this.getMonthlyCost(service, organizationId);
    const limit = this.costLimits.get(service);
    return limit !== undefined && monthCost > limit;
  }

  /**
   * Get remaining budget for a service
   */
  getRemainingBudget(
    service: 'dataforseo' | 'perplexity' | 'semrush' | 'google_search_console',
    organizationId?: string
  ): number {
    const monthCost = this.getMonthlyCost(service, organizationId);
    const limit = this.costLimits.get(service);
    return limit ? Math.max(0, limit - monthCost) : Infinity;
  }

  /**
   * Export cost data to CSV
   */
  exportToCSV(): string {
    const headers = [
      'Service',
      'Operation',
      'Cost',
      'Timestamp',
      'OrganizationId',
      'Metadata',
    ];

    const rows = this.costs.map((c) => [
      c.service,
      c.operation,
      c.cost.toFixed(4),
      c.timestamp.toISOString(),
      c.organizationId || '',
      JSON.stringify(c.metadata || {}),
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  }

  /**
   * Clear all cost data (use with caution!)
   */
  clear(): void {
    this.costs = [];
  }

  /**
   * Get all costs (for database persistence)
   */
  getAllCosts(): APIServiceCost[] {
    return [...this.costs];
  }

  /**
   * Load costs from array (for database restoration)
   */
  loadCosts(costs: APIServiceCost[]): void {
    this.costs = costs.map((c) => ({
      ...c,
      timestamp: new Date(c.timestamp),
    }));
  }
}

/**
 * Singleton instance
 */
export const costTracker = new APICostTracker();

/**
 * Helper function to estimate Q&A content generation cost
 */
export function estimateQAContentCost(options: {
  questionsToGenerate: number;
  usePerplexityResearch?: boolean;
  perplexityModel?: 'sonar' | 'sonar-pro' | 'sonar-reasoning';
}): {
  dataForSEOCost: number;
  perplexityCost: number;
  totalCost: number;
  breakdown: string;
} {
  const { questionsToGenerate, usePerplexityResearch = true, perplexityModel = 'sonar-pro' } = options;

  // DataForSEO PAA cost: $0.30 per SERP request
  // Assume 1 SERP yields 7 questions on average
  const serpsNeeded = Math.ceil(questionsToGenerate / 7);
  const dataForSEOCost = serpsNeeded * 0.3;

  // Perplexity cost depends on model and token usage
  // Assume ~2000 tokens per research query
  let perplexityCost = 0;
  if (usePerplexityResearch) {
    const tokenCosts = {
      sonar: 0.2 / 1_000_000, // per token
      'sonar-pro': 1.0 / 1_000_000,
      'sonar-reasoning': 5.0 / 1_000_000,
    };

    const avgTokens = 2000;
    perplexityCost = questionsToGenerate * avgTokens * tokenCosts[perplexityModel];
  }

  const totalCost = dataForSEOCost + perplexityCost;

  const breakdown = `
DataForSEO: ${serpsNeeded} SERP requests × $0.30 = $${dataForSEOCost.toFixed(2)}
Perplexity: ${questionsToGenerate} queries × ${perplexityModel} = $${perplexityCost.toFixed(2)}
Total: $${totalCost.toFixed(2)}
  `.trim();

  return {
    dataForSEOCost,
    perplexityCost,
    totalCost,
    breakdown,
  };
}

/**
 * Example usage:
 *
 * // Track a DataForSEO PAA request
 * costTracker.trackDataForSEO('getPeopleAlsoAsk', 0.30, 'org_123', {
 *   keyword: 'coffee brewing',
 *   questionsFound: 7,
 * });
 *
 * // Track a Perplexity research request
 * costTracker.trackPerplexity('research', 0.002, 'org_123', {
 *   model: 'sonar-pro',
 *   tokens: 2000,
 * });
 *
 * // Get monthly cost for an organization
 * const monthlyCost = costTracker.getTotalCost(undefined, 'org_123');
 * console.log(`Monthly API cost: $${monthlyCost.toFixed(2)}`);
 *
 * // Check if limit exceeded
 * if (costTracker.isCostLimitExceeded('dataforseo', 'org_123')) {
 *   console.warn('DataForSEO monthly limit exceeded!');
 * }
 *
 * // Get organization summary
 * const summary = costTracker.getOrganizationCostSummary('org_123');
 * console.log(summary);
 *
 * // Estimate cost for generating 50 Q&A posts
 * const estimate = estimateQAContentCost({ questionsToGenerate: 50 });
 * console.log(estimate.breakdown);
 */
