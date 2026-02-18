// Analytics Data Hook
import { useQuery } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type { AnalyticsData, GetAnalyticsRequest, GetAnalyticsResponse } from '../types/api.types';

export function useAnalytics(request: GetAnalyticsRequest) {
  const app = null; // TODO: Use useAppBridge() when configured

  return useQuery<AnalyticsData[]>({
    queryKey: ['analytics', request],
    queryFn: async () => {
      const params = new URLSearchParams({
        startDate: request.startDate,
        endDate: request.endDate,
      });

      if (request.productIds && request.productIds.length > 0) {
        params.append('productIds', request.productIds.join(','));
      }

      const response = await APIClient.get<GetAnalyticsResponse>(
        app,
        `/analytics?${params.toString()}`
      );

      return response.analytics;
    },
    enabled: !!request.startDate && !!request.endDate,
    staleTime: 10 * 60 * 1000, // 10 minutes (GSC data doesn't change frequently)
  });
}
