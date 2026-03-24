import { useState, useEffect, useCallback } from 'react';

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOperatorId, setSelectedOperatorId] = useState(null);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
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
      setLoading(false);
    }
  }, [selectedOperatorId]);

  const fetchSiteCells = useCallback(async (operatorId, band) => {
    try {
      let url = `/site-cells?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      const data = await fetchAPI(url);
      setSiteCells(data || []);
    } catch (err) {
      setSiteCells([]);
    }
  }, []);

  const fetchLatestIndicators = useCallback(async (operatorId, band) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

  const fetchHistoryIndicators = useCallback(async (operatorId, band, dataMonth) => {
    try {
      let url = `/indicators/history?operatorId=${operatorId}`;
      if (band) url += `&band=${encodeURIComponent(band)}`;
      if (dataMonth) url += `&dataMonth=${dataMonth}`;
      const data = await fetchAPI(url);
      setHistoryIndicators(data || []);
    } catch (err) {
      setHistoryIndicators([]);
    }
  }, []);

  const fetchTrendData = useCallback(async (operatorId, band, start, end) => {
    setLoading(true);
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
      setLoading(false);
    }
  }, []);

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
    loading,
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
