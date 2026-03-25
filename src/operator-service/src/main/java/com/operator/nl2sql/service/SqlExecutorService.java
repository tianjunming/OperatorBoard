package com.operator.nl2sql.service;

import org.apache.ibatis.session.SqlSession;
import org.apache.ibatis.session.SqlSessionFactory;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class SqlExecutorService {

    private final SqlSessionFactory sqlSessionFactory;

    public SqlExecutorService(SqlSessionFactory sqlSessionFactory) {
        this.sqlSessionFactory = sqlSessionFactory;
    }

    public List<Map<String, Object>> execute(String sql, Integer maxResults) {
        if (!isSqlReadOnly(sql)) {
            throw new IllegalArgumentException("Only SELECT statements are allowed");
        }

        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("sql", sql);
            params.put("limit", maxResults != null && maxResults > 0 ? maxResults : 1000);
            return session.selectList("nl2sql.safe.executeWithLimit", params);
        }
    }

    public List<Map<String, Object>> executeWithDefaultLimit(String sql) {
        return execute(sql, 1000);
    }

    private boolean isSqlReadOnly(String sql) {
        if (sql == null || sql.isBlank()) {
            return false;
        }
        String trimmed = sql.trim().toUpperCase();
        // Must start with SELECT
        if (!trimmed.startsWith("SELECT")) {
            return false;
        }
        // Check for dangerous patterns
        String[] dangerous = {"DROP", "DELETE", "INSERT", "UPDATE", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE", "EXEC", "EXECUTE"};
        for (String pattern : dangerous) {
            if (trimmed.contains(pattern)) {
                return false;
            }
        }
        return true;
    }

    // ==================== Safe Parameterized Query Methods ====================

    public List<Map<String, Object>> getIndicators(
            String operatorName, String siteCode, String dataTime, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("siteCode", siteCode);
            params.put("dataTime", dataTime);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getIndicators", params);
        }
    }

    public List<Map<String, Object>> getLatestIndicators(
            String operatorName, String[] frequencyBands, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("frequencyBands", frequencyBands);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getLatestIndicators", params);
        }
    }

    public List<Map<String, Object>> getIndicatorsByTime(
            String operatorName, String siteCode, String dataTime, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("siteCode", siteCode);
            params.put("dataTime", dataTime);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getIndicatorsByTime", params);
        }
    }

    public List<Map<String, Object>> getIndicatorsByMonth(
            String operatorName, String siteCode, String yearMonth, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("siteCode", siteCode);
            params.put("yearMonth", yearMonth);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getIndicatorsByMonth", params);
        }
    }

    public List<Map<String, Object>> getTrendData(
            String operatorName, String siteCode, String cellId,
            String startTime, String endTime, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("siteCode", siteCode);
            params.put("cellId", cellId);
            params.put("startTime", startTime);
            params.put("endTime", endTime);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getTrendData", params);
        }
    }

    public List<Map<String, Object>> getAvailableTimes(
            String operatorName, String siteCode, int limit) {
        try (SqlSession session = sqlSessionFactory.openSession()) {
            Map<String, Object> params = new HashMap<>();
            params.put("operatorName", operatorName);
            params.put("siteCode", siteCode);
            params.put("limit", limit);
            return session.selectList("nl2sql.safe.indicator.getAvailableTimes", params);
        }
    }
}
