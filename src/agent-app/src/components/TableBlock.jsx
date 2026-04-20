import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Table2, Filter, Download, X, ChevronFirst, ChevronLast, ChevronLeft, ChevronRight, ArrowUp, ArrowDown, Layers } from 'lucide-react';
import { useTableSort } from '../hooks/useTableSort';
import './MessageItem.css';

function TableBlock({ block }) {
  const {
    sortedData,
    sortConfig,
    globalFilter,
    handleSort,
    handleGlobalFilter,
    exportCSV,
    filteredCount,
    totalCount
  } = useTableSort(block.data || [], block.columns || []);

  const [currentPage, setCurrentPage] = useState(1);
  const [activeRegion, setActiveRegion] = useState('全部');
  const [pageSize] = useState(10);

  // Region column detection
  const regionColumn = useMemo(() => {
    const cols = block.columns || [];
    const regionPatterns = ['region', '区域', '地区', '省份', '城市'];
    return cols.find(col => regionPatterns.some(p => col.toLowerCase().includes(p.toLowerCase())));
  }, [block.columns]);

  // Get all regions
  const regions = useMemo(() => {
    if (!regionColumn) return ['全部'];
    const uniqueRegions = [...new Set((block.data || []).map(row => row[regionColumn]).filter(Boolean))];
    return ['全部', ...uniqueRegions];
  }, [block.data, regionColumn]);

  // Filter data by region
  const regionFilteredData = useMemo(() => {
    if (activeRegion === '全部' || !regionColumn) return filteredCount > 0 ? sortedData : [];
    return sortedData.filter(row => row[regionColumn] === activeRegion);
  }, [sortedData, activeRegion, regionColumn, filteredCount]);

  // Paginated data
  const totalPages = Math.ceil(regionFilteredData.length / pageSize);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return regionFilteredData.slice(start, start + pageSize);
  }, [regionFilteredData, currentPage, pageSize]);

  // Reset page when region changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeRegion]);

  // Handlers
  const handleRegionClick = useCallback((region) => {
    setActiveRegion(region);
  }, []);

  const handlePageFirst = useCallback(() => setCurrentPage(1), []);
  const handlePagePrev = useCallback(() => setCurrentPage(p => Math.max(1, p - 1)), []);
  const handlePageNext = useCallback(() => setCurrentPage(p => Math.min(totalPages, p + 1)), []);
  const handlePageLast = useCallback(() => setCurrentPage(totalPages), []);

  // Region statistics
  const regionStats = useMemo(() => {
    if (!regionColumn) return null;
    const stats = {};
    (block.data || []).forEach(row => {
      const region = row[regionColumn] || '未知';
      if (!stats[region]) stats[region] = 0;
      stats[region]++;
    });
    return stats;
  }, [block.data, regionColumn]);

  if (!block.data || block.data.length === 0) return null;

  return (
    <div className="structured-table" data-testid="structured-table">
      <div className="table-header">
        <Table2 size={14} />
        <span>数据表格</span>
        {regionColumn && (
          <div className="table-region-tabs">
            {regions.slice(0, 5).map(region => (
              <button
                key={region}
                className={`region-tab ${activeRegion === region ? 'active' : ''}`}
                onClick={() => handleRegionClick(region)}
              >
                {region}
                {regionStats && regionStats[region] && (
                  <span className="region-count">{regionStats[region]}</span>
                )}
              </button>
            ))}
            {regions.length > 5 && (
              <span className="region-more">+{regions.length - 5}</span>
            )}
          </div>
        )}
        <span className="table-count">{regionFilteredData.length} / {totalCount} 条</span>
      </div>

      <div className="table-controls">
        <div className="table-search-wrapper">
          <Filter size={12} className="table-filter-icon" />
          <input
            type="text"
            className="table-filter-input"
            placeholder="筛选数据..."
            value={globalFilter}
            onChange={(e) => handleGlobalFilter(e.target.value)}
            data-testid="table-filter-input"
          />
          {globalFilter && (
            <button className="table-filter-clear" onClick={() => handleGlobalFilter('')}>
              <X size={12} />
            </button>
          )}
        </div>
        <button className="table-export-btn" onClick={() => exportCSV()} data-testid="table-export-button">
          <Download size={12} />
          <span>导出</span>
        </button>
      </div>

      <div className="table-scroll">
        <table className="data-table" data-testid="data-table">
          <thead>
            <tr>
              {block.columns.map((col, idx) => (
                <th key={idx} onClick={() => handleSort(col)} data-testid={`table-header-${idx}`}>
                  {col}
                  <span className={`th-sort-indicator ${sortConfig.key === col ? 'active' : ''}`}>
                    {sortConfig.key === col ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                    ) : (
                      <ArrowUp size={12} className="th-sort-icon" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody data-testid="table-body">
            {paginatedData.map((row, idx) => (
              <tr key={idx} data-testid={`table-row-${idx}`}>
                {block.columns.map((col, cidx) => (
                  <td key={cidx} data-testid={`table-cell-${idx}-${cidx}`}>{row[col]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <div className="pagination-info">
            <Layers size={12} />
            <span>第 {currentPage} / {totalPages} 页</span>
          </div>
          <div className="pagination-buttons">
            <button className="pagination-btn" onClick={handlePageFirst} disabled={currentPage === 1}>
              <ChevronFirst size={14} />
            </button>
            <button className="pagination-btn" onClick={handlePagePrev} disabled={currentPage === 1}>
              <ChevronLeft size={14} />
            </button>
            <span className="pagination-current">{currentPage} / {totalPages}</span>
            <button className="pagination-btn" onClick={handlePageNext} disabled={currentPage === totalPages}>
              <ChevronRight size={14} />
            </button>
            <button className="pagination-btn" onClick={handlePageLast} disabled={currentPage === totalPages}>
              <ChevronLast size={14} />
            </button>
          </div>
        </div>
      )}

      {block.citations && block.citations.length > 0 && (
        <div className="citation-list" data-testid="citation-list">
          {block.citations.map((cite) => (
            <div key={cite} className="citation-item">
              <span className="citation-num">{cite}</span>
              <span>数据来源 #{cite}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default TableBlock;
