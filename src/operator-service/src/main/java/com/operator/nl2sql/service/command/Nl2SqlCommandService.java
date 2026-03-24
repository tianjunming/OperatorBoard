package com.operator.nl2sql.service.command;

import com.operator.nl2sql.config.SqlCoderConfig;
import com.operator.nl2sql.dto.Nl2SqlRequest;
import com.operator.nl2sql.service.SqlCoderService;
import com.operator.nl2sql.service.SqlExecutorService;
import com.operator.nl2sql.service.builder.SqlBuilderFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class Nl2SqlCommandService {

    private final SqlCoderService sqlCoderService;
    private final SqlExecutorService sqlExecutorService;
    private final SqlCoderConfig sqlCoderConfig;
    private final SqlBuilderFactory sqlBuilderFactory;

    public Nl2SqlCommandService(
            SqlCoderService sqlCoderService,
            SqlExecutorService sqlExecutorService,
            SqlCoderConfig sqlCoderConfig,
            SqlBuilderFactory sqlBuilderFactory) {
        this.sqlCoderService = sqlCoderService;
        this.sqlExecutorService = sqlExecutorService;
        this.sqlCoderConfig = sqlCoderConfig;
        this.sqlBuilderFactory = sqlBuilderFactory;
    }

    /**
     * 使用NL2SQL生成SQL
     */
    public String generateSql(Nl2SqlRequest request) {
        return sqlCoderService.generateSql(request);
    }

    /**
     * 执行查询SQL
     */
    public List<Map<String, Object>> executeQuery(String sql, Integer maxResults) {
        int limit = maxResults != null ? maxResults : sqlCoderConfig.getMaxResultRows();
        return sqlExecutorService.execute(sql, limit);
    }

    /**
     * SQL安全检查
     */
    public boolean isSqlSafe(String sql) {
        if (sql == null || sql.isBlank()) {
            return false;
        }

        String upperSql = sql.toUpperCase().trim();

        if (!upperSql.startsWith("SELECT")) {
            return false;
        }

        String[] unsafePatterns = {"DROP", "DELETE", "INSERT", "UPDATE", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"};
        for (String pattern : unsafePatterns) {
            if (upperSql.contains(pattern)) {
                return false;
            }
        }

        return true;
    }

    // ==================== 便捷SQL构建方法 ====================

    /**
     * 查询所有指标数据
     */
    public List<Map<String, Object>> findAllIndicators(Integer maxResults) {
        String sql = sqlBuilderFactory.getIndicatorSqlBuilder().buildSelectSql();
        return executeQuery(sql, maxResults);
    }

    /**
     * 根据运营商ID和月份查询指标
     */
    public List<Map<String, Object>> findIndicatorsByOperatorIdAndMonth(Long operatorId, String dataMonth, Integer maxResults) {
        String sql = sqlBuilderFactory.getIndicatorSqlBuilder().buildByOperatorIdAndMonth(operatorId, dataMonth);
        return executeQuery(sql, maxResults);
    }

    /**
     * 查询最新指标数据
     */
    public List<Map<String, Object>> findLatestIndicators(Long operatorId, Integer maxResults) {
        String sql = operatorId != null
                ? sqlBuilderFactory.getIndicatorSqlBuilder().buildLatestByOperatorId(operatorId)
                : sqlBuilderFactory.getIndicatorSqlBuilder().buildLatestForAllOperators();
        return executeQuery(sql, maxResults);
    }

    /**
     * 查询趋势数据
     */
    public List<Map<String, Object>> findTrendData(Long operatorId, Integer maxResults) {
        String sql = sqlBuilderFactory.getIndicatorSqlBuilder().buildTrendByOperatorId(operatorId);
        return executeQuery(sql, maxResults);
    }

    /**
     * 查询所有站点汇总
     */
    public List<Map<String, Object>> findAllSiteSummary(Integer maxResults) {
        String sql = sqlBuilderFactory.getOperatorSqlBuilder().buildAllSiteSummary();
        return executeQuery(sql, maxResults);
    }

    /**
     * 根据运营商ID和月份查询站点汇总
     */
    public List<Map<String, Object>> findSiteSummaryByOperatorIdAndMonth(Long operatorId, String dataMonth, Integer maxResults) {
        String sql = sqlBuilderFactory.getOperatorSqlBuilder().buildSiteSummaryByOperatorIdAndMonth(operatorId, dataMonth);
        return executeQuery(sql, maxResults);
    }

    /**
     * 查询指定频段指标
     */
    public List<Map<String, Object>> findBandIndicator(Long operatorId, String dataMonth, String networkType, String band, Integer maxResults) {
        String sql = sqlBuilderFactory.getIndicatorSqlBuilder().buildBandIndicator(operatorId, dataMonth, networkType, band);
        return executeQuery(sql, maxResults);
    }

    /**
     * 查询指定频段站点
     */
    public List<Map<String, Object>> findBandSiteSummary(String dataMonth, String networkType, String band, Integer maxResults) {
        String sql = sqlBuilderFactory.getOperatorSqlBuilder().buildSiteSummaryByBand(dataMonth, networkType, band);
        return executeQuery(sql, maxResults);
    }
}