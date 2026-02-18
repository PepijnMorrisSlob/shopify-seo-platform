// Performance Analytics Hooks
import { useQuery } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  GetPerformanceRequest,
  GetPerformanceResponse,
  QAAnalytics,
} from '../types/qa-content.types';

// Get performance data for specific page or all pages
export function usePerformance(pageId?: string, startDate?: string, endDate?: string) {
  const today = new Date();
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const start = startDate || thirtyDaysAgo.toISOString().split('T')[0];
  const end = endDate || today.toISOString().split('T')[0];

  return useQuery<GetPerformanceResponse>({
    queryKey: ['performance', pageId, start, end],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (pageId) params.append('pageId', pageId);
      params.append('startDate', start);
      params.append('endDate', end);

      return APIClient.get<GetPerformanceResponse>(
        null,
        `/analytics/performance?${params.toString()}`
      );
    },
  });
}

// Get Q&A analytics dashboard data
export function useQAAnalytics() {
  return useQuery<QAAnalytics>({
    queryKey: ['qaAnalytics'],
    queryFn: async () => {
      return APIClient.get<QAAnalytics>(null, '/analytics/qa-overview');
    },
  });
}

// Get content gaps (unanswered questions with high potential)
export function useContentGaps() {
  return useQuery({
    queryKey: ['contentGaps'],
    queryFn: async () => {
      return APIClient.get(null, '/analytics/content-gaps');
    },
  });
}

// Get internal linking opportunities
export function useInternalLinkingOpportunities() {
  return useQuery({
    queryKey: ['linkingOpportunities'],
    queryFn: async () => {
      return APIClient.get(null, '/analytics/linking-opportunities');
    },
  });
}
