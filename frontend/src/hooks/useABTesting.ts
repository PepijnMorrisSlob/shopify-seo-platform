// A/B Testing Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  ABTest,
  CreateABTestRequest,
  CreateABTestResponse,
} from '../types/qa-content.types';

// Get all A/B tests
export function useABTests(status?: 'running' | 'completed' | 'winner_applied' | 'cancelled') {
  return useQuery<ABTest[]>({
    queryKey: ['abTests', status],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);

      return APIClient.get<ABTest[]>(null, `/ab-tests?${params.toString()}`);
    },
  });
}

// Get single A/B test
export function useABTest(testId: string) {
  return useQuery<ABTest>({
    queryKey: ['abTest', testId],
    queryFn: async () => {
      return APIClient.get<ABTest>(null, `/ab-tests/${testId}`);
    },
    enabled: !!testId,
  });
}

// Create A/B test
export function useCreateABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateABTestRequest) => {
      return APIClient.post<CreateABTestResponse>(null, '/ab-tests', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abTests'] });
    },
  });
}

// Apply winning variation
export function useApplyWinner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testId: string) => {
      return APIClient.post(null, `/ab-tests/${testId}/apply-winner`, {});
    },
    onSuccess: (_, testId) => {
      queryClient.invalidateQueries({ queryKey: ['abTests'] });
      queryClient.invalidateQueries({ queryKey: ['abTest', testId] });
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
    },
  });
}

// Cancel A/B test
export function useCancelABTest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testId: string) => {
      return APIClient.post(null, `/ab-tests/${testId}/cancel`, {});
    },
    onSuccess: (_, testId) => {
      queryClient.invalidateQueries({ queryKey: ['abTests'] });
      queryClient.invalidateQueries({ queryKey: ['abTest', testId] });
    },
  });
}
