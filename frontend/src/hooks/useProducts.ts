// Product Data Fetching Hook
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type { Product, SyncProductsRequest, SyncProductsResponse } from '../types/api.types';

export function useProducts() {
  // TODO: Get app from useAppBridge() when App Bridge is configured
  const app = null;

  return useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => APIClient.get<Product[]>(app, '/products'),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useProduct(productId: string) {
  const app = null;

  return useQuery<Product>({
    queryKey: ['products', productId],
    queryFn: () => APIClient.get<Product>(app, `/products/${productId}`),
    enabled: !!productId,
  });
}

export function useSyncProducts() {
  const app = null;
  const queryClient = useQueryClient();

  return useMutation<SyncProductsResponse, Error, SyncProductsRequest>({
    mutationFn: (data) => APIClient.post<SyncProductsResponse>(app, '/products/sync', data),
    onSuccess: () => {
      // Invalidate products query to refetch data
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}
