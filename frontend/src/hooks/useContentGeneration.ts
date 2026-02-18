// Content Generation Hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  ContentGeneration,
  GenerateContentRequest,
  GenerateContentResponse,
  PublishContentRequest,
  PublishContentResponse,
} from '../types/api.types';

export function useContentGeneration(productId?: string) {
  const app = null; // TODO: Use useAppBridge() when configured

  return useQuery<ContentGeneration[]>({
    queryKey: ['content-generations', productId],
    queryFn: () => {
      const endpoint = productId
        ? `/content/generations?productId=${productId}`
        : '/content/generations';
      return APIClient.get<ContentGeneration[]>(app, endpoint);
    },
  });
}

export function useGenerateContent() {
  const app = null;
  const queryClient = useQueryClient();

  return useMutation<GenerateContentResponse, Error, GenerateContentRequest>({
    mutationFn: (data) =>
      APIClient.post<GenerateContentResponse>(app, '/content/generate', data),
    onSuccess: () => {
      // Invalidate content generations query to refetch data
      queryClient.invalidateQueries({ queryKey: ['content-generations'] });
    },
  });
}

export function usePublishContent() {
  const app = null;
  const queryClient = useQueryClient();

  return useMutation<PublishContentResponse, Error, PublishContentRequest>({
    mutationFn: (data) =>
      APIClient.post<PublishContentResponse>(app, '/content/publish', data),
    onSuccess: (data) => {
      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['content-generations'] });
      queryClient.invalidateQueries({ queryKey: ['products', data.productId] });
    },
  });
}
