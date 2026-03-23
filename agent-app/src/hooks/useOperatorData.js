import { useState, useEffect, useCallback } from 'react';

const API_BASE = '/api/operator';

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
  const [latestIndicators, setLatestIndicators] = useState([]);
  const [compareData, setCompareData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedOperator, setSelectedOperator] = useState('中国移动');

  const fetchLatestIndicators = useCallback(async (operatorName) => {
    setLoading(true);
    try {
      const data = await fetchAPI(`/indicators/latest?operatorName=${operatorName}&limit=20`);
      setLatestIndicators(data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setLatestIndicators([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCompareData = useCallback(async (operatorName, currentMonth, compareMonth, siteCode) => {
    setLoading(true);
    try {
      let url = `/indicators/compare?operatorName=${operatorName}&currentMonth=${currentMonth}&compareMonth=${compareMonth}`;
      if (siteCode) url += `&siteCode=${siteCode}`;
      const data = await fetchAPI(url);
      setCompareData(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTrendData = useCallback(async (operatorName, startTime, endTime, cellId) => {
    setLoading(true);
    try {
      let url = `/indicators/trend?operatorName=${operatorName}&startTime=${startTime}&endTime=${endTime}&limit=1000`;
      if (cellId) url += `&cellId=${cellId}`;
      const data = await fetchAPI(url);
      setTrendData(data.results || []);
      setError(null);
    } catch (err) {
      setError(err.message);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAvailableTimes = useCallback(async (operatorName) => {
    try {
      let url = '/times';
      if (operatorName) url += `?operatorName=${operatorName}`;
      const data = await fetchAPI(url);
      setAvailableTimes(data.results || []);
    } catch (err) {
      setAvailableTimes([]);
    }
  }, []);

  useEffect(() => {
    fetchLatestIndicators(selectedOperator);
    fetchAvailableTimes(selectedOperator);
  }, [selectedOperator, fetchLatestIndicators, fetchAvailableTimes]);

  return {
    latestIndicators,
    compareData,
    trendData,
    availableTimes,
    loading,
    error,
    selectedOperator,
    setSelectedOperator,
    fetchLatestIndicators: () => fetchLatestIndicators(selectedOperator),
    fetchCompareData,
    fetchTrendData,
  };
}
