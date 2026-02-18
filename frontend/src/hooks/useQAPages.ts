// Q&A Pages Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  QAPage,
  QAPageStatus,
  GetQAPagesRequest,
  GetQAPagesResponse,
  ApproveQAPageRequest,
  ApproveQAPageResponse,
} from '../types/qa-content.types';

// Get Q&A pages with filters and pagination
export function useQAPages(
  status?: QAPageStatus,
  limit: number = 20,
  offset: number = 0,
  sortBy: 'createdAt' | 'seoScore' | 'traffic' | 'position' = 'createdAt',
  sortOrder: 'asc' | 'desc' = 'desc'
) {
  return useQuery<GetQAPagesResponse>({
    queryKey: ['qaPages', status, limit, offset, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      return APIClient.get<GetQAPagesResponse>(null, `/qa-pages?${params.toString()}`);
    },
  });
}

// Get single Q&A page
export function useQAPage(pageId: string) {
  return useQuery<QAPage>({
    queryKey: ['qaPage', pageId],
    queryFn: async () => {
      return APIClient.get<QAPage>(null, `/qa-pages/${pageId}`);
    },
    enabled: !!pageId,
  });
}

// Approve and optionally publish Q&A page
export function useApproveQAPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ApproveQAPageRequest) => {
      return APIClient.post<ApproveQAPageResponse>(
        null,
        `/qa-pages/${data.pageId}/approve`,
        { publish: data.publish }
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
      queryClient.invalidateQueries({ queryKey: ['qaPage', variables.pageId] });
    },
  });
}

// Update Q&A page content
export function useUpdateQAPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ pageId, updates }: { pageId: string; updates: Partial<QAPage> }) => {
      return APIClient.put<QAPage>(null, `/qa-pages/${pageId}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
      queryClient.invalidateQueries({ queryKey: ['qaPage', variables.pageId] });
    },
  });
}

// Delete Q&A page
export function useDeleteQAPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      return APIClient.delete(null, `/qa-pages/${pageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
    },
  });
}

// Regenerate Q&A page content
export function useRegenerateQAPage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (pageId: string) => {
      return APIClient.post<QAPage>(null, `/qa-pages/${pageId}/regenerate`, {});
    },
    onSuccess: (_, pageId) => {
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
      queryClient.invalidateQueries({ queryKey: ['qaPage', pageId] });
    },
  });
}
