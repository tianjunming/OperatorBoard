import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../api/client';

// Fetch operators list
export function useOperators() {
  return useQuery({
    queryKey: ['operators'],
    queryFn: async () => {
      const data = await apiFetch('/query/operators');
      return data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Fetch site cells for an operator
export function useOperatorSiteCells(operatorId) {
  return useQuery({
    queryKey: ['operator-site-cells', operatorId],
    queryFn: async () => {
      const data = await apiFetch(`/query/site-cells?operatorId=${operatorId}`);
      return data || [];
    },
    enabled: !!operatorId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch latest indicators for an operator
export function useLatestIndicators(operatorId) {
  return useQuery({
    queryKey: ['latest-indicators', operatorId],
    queryFn: async () => {
      const data = await apiFetch(`/query/indicators/latest?operatorId=${operatorId}`);
      return data || [];
    },
    enabled: !!operatorId,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch history indicators for an operator
export function useHistoryIndicators(operatorId, dataMonth) {
  return useQuery({
    queryKey: ['history-indicators', operatorId, dataMonth],
    queryFn: async () => {
      const data = await apiFetch(`/query/indicators/history?operatorId=${operatorId}${dataMonth ? `&dataMonth=${dataMonth}` : ''}`);
      return data || [];
    },
    enabled: !!operatorId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch indicator trend
export function useIndicatorTrend(operatorId, options = {}) {
  const { band, start, end, months = 6 } = options;

  return useQuery({
    queryKey: ['indicator-trend', operatorId, band, start, end],
    queryFn: async () => {
      let url = `/query/indicators/trend?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      if (start) url += `&start=${encodeURIComponent(start)}`;
      if (end) url += `&end=${encodeURIComponent(end)}`;
      const data = await apiFetch(url);
      return data || [];
    },
    enabled: !!operatorId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch indicator comparison
export function useIndicatorCompare(operatorId, dataMonth) {
  return useQuery({
    queryKey: ['indicator-compare', operatorId, dataMonth],
    queryFn: async () => {
      const data = await apiFetch(`/query/indicators/compare?operatorId=${operatorId}${dataMonth ? `&dataMonth=${dataMonth}` : ''}`);
      return data || [];
    },
    enabled: !!operatorId,
    staleTime: 2 * 60 * 1000,
  });
}

// Prefetch operators (for warming up cache)
export function usePrefetchOperators() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.prefetchQuery({
      queryKey: ['operators'],
      queryFn: async () => {
        const data = await apiFetch('/query/operators');
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  };
}

// Invalidate operators cache
export function useInvalidateOperators() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['operators'] });
  };
}
