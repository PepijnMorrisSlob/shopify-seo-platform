// Calendar Hook - Fetch and mutate calendar items
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIClient } from '../utils/api-client';
import type {
  CalendarItem,
  CalendarFilters,
  GetCalendarItemsResponse,
  RescheduleRequest,
  RescheduleResponse,
  UpdateStatusRequest,
  UpdateStatusResponse,
  CalendarContentStatus,
} from '../types/calendar.types';

// Get calendar items for a date range with optional filters
export function useCalendarItems(
  start: string,
  end: string,
  filters?: CalendarFilters
) {
  return useQuery<GetCalendarItemsResponse>({
    queryKey: ['calendarItems', start, end, filters?.contentType, filters?.status],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('start', start);
      params.append('end', end);
      if (filters?.contentType) {
        params.append('type', filters.contentType);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }

      return APIClient.get<GetCalendarItemsResponse>(null, `/calendar?${params.toString()}`);
    },
    enabled: !!start && !!end,
  });
}

// Get a single calendar item
export function useCalendarItem(itemId: string) {
  return useQuery<CalendarItem>({
    queryKey: ['calendarItem', itemId],
    queryFn: async () => {
      return APIClient.get<CalendarItem>(null, `/calendar/${itemId}`);
    },
    enabled: !!itemId,
  });
}

// Reschedule a calendar item (drag-drop or manual date change)
export function useRescheduleCalendarItem() {
  const queryClient = useQueryClient();

  return useMutation<RescheduleResponse, Error, { itemId: string; data: RescheduleRequest }>({
    mutationFn: async ({ itemId, data }) => {
      return APIClient.request<RescheduleResponse>(
        null,
        `/calendar/${itemId}/reschedule`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    // Optimistic update for smooth drag-drop experience
    onMutate: async ({ itemId, data }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['calendarItems'] });

      // Snapshot the previous value
      const previousItems = queryClient.getQueriesData({ queryKey: ['calendarItems'] });

      // Optimistically update the cache
      queryClient.setQueriesData<GetCalendarItemsResponse>(
        { queryKey: ['calendarItems'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === itemId
                ? { ...item, scheduledAt: data.scheduledAt }
                : item
            ),
          };
        }
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousItems) {
        context.previousItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: ['calendarItems'] });
    },
  });
}

// Update calendar item status
export function useUpdateCalendarStatus() {
  const queryClient = useQueryClient();

  return useMutation<UpdateStatusResponse, Error, { itemId: string; data: UpdateStatusRequest }>({
    mutationFn: async ({ itemId, data }) => {
      return APIClient.request<UpdateStatusResponse>(
        null,
        `/calendar/${itemId}/status`,
        {
          method: 'PATCH',
          body: JSON.stringify(data),
        }
      );
    },
    // Optimistic update
    onMutate: async ({ itemId, data }) => {
      await queryClient.cancelQueries({ queryKey: ['calendarItems'] });

      const previousItems = queryClient.getQueriesData({ queryKey: ['calendarItems'] });

      queryClient.setQueriesData<GetCalendarItemsResponse>(
        { queryKey: ['calendarItems'] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            items: old.items.map((item) =>
              item.id === itemId
                ? {
                    ...item,
                    status: data.status,
                    publishedAt: data.status === 'published' ? new Date().toISOString() : item.publishedAt
                  }
                : item
            ),
          };
        }
      );

      return { previousItems };
    },
    onError: (err, variables, context) => {
      if (context?.previousItems) {
        context.previousItems.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['calendarItems'] });
    },
  });
}

// Custom hook combining all calendar operations
export function useCalendar(start: string, end: string, filters?: CalendarFilters) {
  const itemsQuery = useCalendarItems(start, end, filters);
  const rescheduleMutation = useRescheduleCalendarItem();
  const updateStatusMutation = useUpdateCalendarStatus();

  const reschedule = (itemId: string, scheduledAt: string) => {
    return rescheduleMutation.mutateAsync({
      itemId,
      data: { scheduledAt },
    });
  };

  const updateStatus = (itemId: string, status: CalendarContentStatus) => {
    return updateStatusMutation.mutateAsync({
      itemId,
      data: { status },
    });
  };

  return {
    // Query data
    items: itemsQuery.data?.items || [],
    total: itemsQuery.data?.total || 0,
    isLoading: itemsQuery.isLoading,
    isError: itemsQuery.isError,
    error: itemsQuery.error,
    refetch: itemsQuery.refetch,

    // Mutations
    reschedule,
    isRescheduling: rescheduleMutation.isPending,
    rescheduleError: rescheduleMutation.error,

    updateStatus,
    isUpdatingStatus: updateStatusMutation.isPending,
    updateStatusError: updateStatusMutation.error,
  };
}
