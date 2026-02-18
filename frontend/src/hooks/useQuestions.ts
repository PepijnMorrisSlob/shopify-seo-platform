// Question Discovery Hooks
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  Question,
  QuestionFilters,
  DiscoverQuestionsRequest,
  DiscoverQuestionsResponse,
  AddToQueueRequest,
  AddToQueueResponse,
} from '../types/qa-content.types';

// Discover questions with filters
export function useQuestions(filters?: QuestionFilters, limit: number = 50, offset: number = 0) {
  return useQuery<DiscoverQuestionsResponse>({
    queryKey: ['questions', filters, limit, offset],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters?.source) params.append('source', filters.source);
      if (filters?.category) params.append('category', filters.category);
      if (filters?.priority) params.append('priority', filters.priority);
      if (filters?.minSearchVolume) params.append('minSearchVolume', filters.minSearchVolume.toString());
      if (filters?.maxSearchVolume) params.append('maxSearchVolume', filters.maxSearchVolume.toString());
      if (filters?.status) params.append('status', filters.status);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      return APIClient.get<DiscoverQuestionsResponse>(
        null,
        `/questions/discover?${params.toString()}`
      );
    },
  });
}

// Add questions to generation queue
export function useAddToQueue() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddToQueueRequest) => {
      return APIClient.post<AddToQueueResponse>(null, '/questions/add-to-queue', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      queryClient.invalidateQueries({ queryKey: ['qaPages'] });
    },
  });
}

// Get question categories for filtering
export function useQuestionCategories() {
  return useQuery<string[]>({
    queryKey: ['questionCategories'],
    queryFn: async () => {
      return APIClient.get<string[]>(null, '/questions/categories');
    },
  });
}
