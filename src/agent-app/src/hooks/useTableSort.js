import { useState, useMemo, useCallback } from 'react';

/**
 * Hook for table sorting, filtering, and CSV export
 */
export function useTableSort(initialData = [], initialColumns = []) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [filters, setFilters] = useState({});
  const [globalFilter, setGlobalFilter] = useState('');

  // Sort data
  const sortedData = useMemo(() => {
    let result = [...initialData];

    // Apply global filter
    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(lowerFilter)
        )
      );
    }

    // Apply column filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        const lowerValue = value.toLowerCase();
        result = result.filter(row =>
          String(row[key] || '').toLowerCase().includes(lowerValue)
        );
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        // Try numeric comparison first
        const aNum = parseFloat(aVal);
        const bNum = parseFloat(bVal);
        if (!isNaN(aNum) && !isNaN(bNum)) {
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        // Fall back to string comparison
        const aStr = String(aVal || '');
        const bStr = String(bVal || '');
        const comparison = aStr.localeCompare(bStr, 'zh-CN');
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [initialData, sortConfig, filters, globalFilter]);

  const handleSort = useCallback((key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  }, []);

  const handleFilter = useCallback((column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  }, []);

  const handleGlobalFilter = useCallback((value) => {
    setGlobalFilter(value);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({});
    setGlobalFilter('');
    setSortConfig({ key: null, direction: null });
  }, []);

  const exportCSV = useCallback((filename = 'export.csv') => {
    if (sortedData.length === 0) return;

    const headers = initialColumns.join(',');
    const rows = sortedData.map(row =>
      initialColumns.map(col => {
        const val = row[col] || '';
        // Escape values with commas or quotes
        if (String(val).includes(',') || String(val).includes('"')) {
          return `"${String(val).replace(/"/g, '""')}"`;
        }
        return val;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [sortedData, initialColumns]);

  return {
    sortedData,
    sortConfig,
    filters,
    globalFilter,
    handleSort,
    handleFilter,
    handleGlobalFilter,
    clearFilters,
    exportCSV,
    totalCount: initialData.length,
    filteredCount: sortedData.length
  };
}

export default useTableSort;
