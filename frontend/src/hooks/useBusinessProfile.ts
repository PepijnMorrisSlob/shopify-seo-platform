// Business Profile Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  BusinessProfile,
  CreateBusinessProfileRequest,
  UpdateBusinessProfileRequest,
} from '../types/qa-content.types';

// Fetch business profile
export function useBusinessProfile() {
  return useQuery<BusinessProfile>({
    queryKey: ['businessProfile'],
    queryFn: async () => {
      return APIClient.get<BusinessProfile>(null, '/business-profile');
    },
  });
}

// Create business profile
export function useCreateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBusinessProfileRequest) => {
      return APIClient.post<BusinessProfile>(null, '/business-profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}

// Update business profile
export function useUpdateBusinessProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateBusinessProfileRequest) => {
      return APIClient.put<BusinessProfile>(null, '/business-profile', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businessProfile'] });
    },
  });
}
