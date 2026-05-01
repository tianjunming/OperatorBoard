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

// Fetch site cells for an operator (legacy endpoint)
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

// Fetch latest indicators for an operator (legacy endpoint)
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

// ==================== V2 Summary Table APIs ====================
// These use the new site_summary and indicator_summary tables

// Fetch all operators site summary (V2)
export function useAllOperatorsSiteSummary() {
  return useQuery({
    queryKey: ['nl2sql', 'all-operators-site-summary'],
    queryFn: async () => {
      const data = await apiFetch('/nl2sql/operators/all/site-summary/latest');
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single operator site summary (V2)
export function useOperatorSiteSummary(operatorName) {
  return useQuery({
    queryKey: ['nl2sql', 'operator-site-summary', operatorName],
    queryFn: async () => {
      if (!operatorName) return null;
      const data = await apiFetch(`/nl2sql/operators/${encodeURIComponent(operatorName)}/site-summary/latest`);
      return data;
    },
    enabled: !!operatorName,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single operator site summary history (V2)
export function useOperatorSiteSummaryHistory(operatorName) {
  return useQuery({
    queryKey: ['nl2sql', 'operator-site-summary-history', operatorName],
    queryFn: async () => {
      if (!operatorName) return [];
      const data = await apiFetch(`/nl2sql/operators/${encodeURIComponent(operatorName)}/site-summary/history`);
      return data || [];
    },
    enabled: !!operatorName,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all operators indicator summary (V2)
export function useAllOperatorsIndicatorSummary() {
  return useQuery({
    queryKey: ['nl2sql', 'all-operators-indicator-summary'],
    queryFn: async () => {
      const data = await apiFetch('/nl2sql/operators/all/indicator-summary/latest');
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single operator indicator summary (V2)
export function useOperatorIndicatorSummary(operatorName) {
  return useQuery({
    queryKey: ['nl2sql', 'operator-indicator-summary', operatorName],
    queryFn: async () => {
      if (!operatorName) return null;
      const data = await apiFetch(`/nl2sql/operators/${encodeURIComponent(operatorName)}/indicator-summary/latest`);
      return data;
    },
    enabled: !!operatorName,
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch single operator indicator summary history (V2)
export function useOperatorIndicatorSummaryHistory(operatorName) {
  return useQuery({
    queryKey: ['nl2sql', 'operator-indicator-summary-history', operatorName],
    queryFn: async () => {
      if (!operatorName) return [];
      const data = await apiFetch(`/nl2sql/operators/${encodeURIComponent(operatorName)}/indicator-summary/history`);
      return data || [];
    },
    enabled: !!operatorName,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch all operators PRB metrics (V2)
export function useAllOperatorsPRB() {
  return useQuery({
    queryKey: ['nl2sql', 'all-operators-prb'],
    queryFn: async () => {
      const data = await apiFetch('/nl2sql/operators/all/indicators/ul-prb');
      return data || [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

// Fetch all operators traffic metrics (V2) - 分流比、驻留比
export function useAllOperatorsTrafficMetrics() {
  return useQuery({
    queryKey: ['nl2sql', 'all-operators-traffic-metrics'],
    queryFn: async () => {
      const data = await apiFetch('/nl2sql/operators/all/indicators/traffic-metrics');
      return data || [];
    },
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

// Prefetch all operators V2 summary data
export function usePrefetchAllOperatorsSummary() {
  const queryClient = useQueryClient();

  return () => {
    // Prefetch site summary for all operators
    queryClient.prefetchQuery({
      queryKey: ['nl2sql', 'all-operators-site-summary'],
      queryFn: async () => {
        const data = await apiFetch('/nl2sql/operators/all/site-summary/latest');
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch indicator summary for all operators
    queryClient.prefetchQuery({
      queryKey: ['nl2sql', 'all-operators-indicator-summary'],
      queryFn: async () => {
        const data = await apiFetch('/nl2sql/operators/all/indicator-summary/latest');
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });

    // Prefetch traffic metrics
    queryClient.prefetchQuery({
      queryKey: ['nl2sql', 'all-operators-traffic-metrics'],
      queryFn: async () => {
        const data = await apiFetch('/nl2sql/operators/all/indicators/traffic-metrics');
        return data || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  };
}

// Invalidate all V2 summary caches
export function useInvalidateAllSummary() {
  const queryClient = useQueryClient();

  return () => {
    queryClient.invalidateQueries({ queryKey: ['nl2sql'] });
  };
}
