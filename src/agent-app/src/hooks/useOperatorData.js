import { useState, useEffect, useCallback, useRef } from 'react';

const API_BASE = '/api/query';

async function fetchAPI(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  return response.json();
}

export function useOperatorData() {
  const [operators, setOperators] = useState([]);
  const [siteCells, setSiteCells] = useState([]);
  const [latestIndicators, setLatestIndicators] = useState([]);
  const [historyIndicators, setHistoryIndicators] = useState([]);
  const [loadingKeys, setLoadingKeys] = useState(new Set());
  const [error, setError] = useState(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);

  const addLoadingKey = useCallback((key) => {
    setLoadingKeys(prev => new Set([...prev, key]));
  }, []);

  const removeLoadingKey = useCallback((key) => {
    setLoadingKeys(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }, []);

  const isLoading = useCallback((key) => {
    return key ? loadingKeys.has(key) : loadingKeys.size > 0;
  }, [loadingKeys]);

  const fetchOperators = useCallback(async () => {
    addLoadingKey('operators');
    try {
      const data = await fetchAPI('/operators');
      setOperators(data || []);
      if (data && data.length > 0 && !selectedOperatorId) {
        setSelectedOperatorId(data[0].id);
      }
      setError(null);
    } catch (err) {
      setError(err.message);
      setOperators([]);
    } finally {
      removeLoadingKey('operators');
    }
  }, [selectedOperatorId, addLoadingKey, removeLoadingKey]);

  const fetchSiteCells = useCallback(async (operatorId, band) => {
    addLoadingKey('siteCells');
    try {
      let url = `/site-cells?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      const data = await fetchAPI(url);
      setSiteCells(data || []);
    } catch (err) {
      setSiteCells([]);
    } finally {
      removeLoadingKey('siteCells');
    }
  }, [addLoadingKey, removeLoadingKey]);

  const fetchLatestIndicators = useCallback(async (operatorId, band) => {
    addLoadingKey('latestIndicators');
    try {
      let url = `/indicators/latest?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      const data = await fetchAPI(url);
      setLatestIndicators(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLatestIndicators([]);
    } finally {
      removeLoadingKey('latestIndicators');
    }
  }, [addLoadingKey, removeLoadingKey]);

  const fetchHistoryIndicators = useCallback(async (operatorId, band, dataMonth) => {
    addLoadingKey('historyIndicators');
    try {
      let url = `/indicators/history?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      if (dataMonth) url += `&dataMonth=${dataMonth}`;
      const data = await fetchAPI(url);
      setHistoryIndicators(data || []);
    } catch (err) {
      setHistoryIndicators([]);
    } finally {
      removeLoadingKey('historyIndicators');
    }
  }, [addLoadingKey, removeLoadingKey]);

  const fetchTrendData = useCallback(async (operatorId, band, start, end) => {
    addLoadingKey('trend');
    try {
      let url = `/indicators/trend?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      if (start) url += `&start=${encodeURIComponent(start)}`;
      if (end) url += `&end=${encodeURIComponent(end)}`;
      const data = await fetchAPI(url);
      setHistoryIndicators(data || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setHistoryIndicators([]);
    } finally {
      removeLoadingKey('trend');
    }
  }, [addLoadingKey, removeLoadingKey]);

  useEffect(() => {
    fetchOperators();
  }, []);

  useEffect(() => {
    if (selectedOperatorId) {
      fetchSiteCells(selectedOperatorId);
      fetchLatestIndicators(selectedOperatorId);
    }
  }, [selectedOperatorId, fetchSiteCells, fetchLatestIndicators]);

  return {
    operators,
    siteCells,
    latestIndicators,
    historyIndicators,
    loadingKeys,
    isLoading,
    error,
    selectedOperatorId,
    setSelectedOperatorId,
    fetchOperators,
    fetchSiteCells,
    fetchLatestIndicators,
    fetchHistoryIndicators,
    fetchTrendData,
  };
}
