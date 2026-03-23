package com.operator.nl2sql.service;

import com.operator.nl2sql.config.SchemaCache;
import com.operator.nl2sql.config.SqlCoderConfig;
import com.operator.nl2sql.dto.Nl2SqlRequest;
import com.operator.nl2sql.dto.Nl2SqlResponse;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class Nl2SqlService {

    private final SqlCoderService sqlCoderService;
    private final SqlExecutorService sqlExecutorService;
    private final SqlCoderConfig sqlCoderConfig;
    private final SchemaCache schemaCache;

    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter YEAR_MONTH_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM");

    public Nl2SqlService(
            SqlCoderService sqlCoderService,
            SqlExecutorService sqlExecutorService,
            SqlCoderConfig sqlCoderConfig,
            SchemaCache schemaCache) {
        this.sqlCoderService = sqlCoderService;
        this.sqlExecutorService = sqlExecutorService;
        this.sqlCoderConfig = sqlCoderConfig;
        this.schemaCache = schemaCache;
    }

    public Nl2SqlResponse executeQuery(Nl2SqlRequest request) {
        long startTime = System.currentTimeMillis();

        try {
            String generatedSql = sqlCoderService.generateSql(request);

            if (!isSqlSafe(generatedSql)) {
                return Nl2SqlResponse.builder()
                        .generatedSql(generatedSql)
                        .status("error")
                        .errorMessage("Generated SQL contains potentially unsafe operations")
                        .executionTimeMs(System.currentTimeMillis() - startTime)
                        .build();
            }

            List<Map<String, Object>> results = sqlExecutorService.execute(
                    generatedSql,
                    request.getMaxResults() != null ? request.getMaxResults() : sqlCoderConfig.getMaxResultRows()
            );

            Nl2SqlResponse.QueryMeta meta = Nl2SqlResponse.QueryMeta.builder()
                    .startTime(request.getStartTime())
                    .endTime(request.getEndTime())
                    .isLatest(request.getLatest())
                    .isCompare(request.getCompare())
                    .indicators(request.getIndicators())
                    .build();

            return Nl2SqlResponse.builder()
                    .generatedSql(generatedSql)
                    .results(results)
                    .rowCount(results.size())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .status("success")
                    .meta(meta)
                    .build();

        } catch (Exception e) {
            return Nl2SqlResponse.builder()
                    .status("error")
                    .errorMessage(e.getMessage())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    public String getSchemaContext() {
        return schemaCache.getSchemaContext();
    }

    public List<Map<String, Object>> getIndicators(
            String operatorName, String siteCode, LocalDateTime dataTime, int limit) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT i.*, s.site_name, s.band, o.operator_name ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE 1=1 ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (siteCode != null && !siteCode.isBlank()) {
            sql.append("AND s.site_code = '").append(siteCode).append("' ");
        }
        if (dataTime != null) {
            sql.append("AND i.data_time = '").append(dataTime.format(DATETIME_FORMATTER)).append("' ");
        } else {
            sql.append("AND i.data_time = (SELECT MAX(data_time) FROM indicator_info) ");
        }
        sql.append("ORDER BY i.data_time DESC ");
        sql.append("LIMIT ").append(limit);

        return sqlExecutorService.execute(sql.toString(), limit);
    }

    public List<Map<String, Object>> getLatestIndicators(
            String operatorName, String[] frequencyBands, int limit) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT i.*, s.site_name, s.band, o.operator_name ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE i.data_time = (SELECT MAX(data_time) FROM indicator_info) ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (frequencyBands != null && frequencyBands.length > 0) {
            sql.append("AND s.band IN (");
            for (int i = 0; i < frequencyBands.length; i++) {
                sql.append("'").append(frequencyBands[i]).append("'");
                if (i < frequencyBands.length - 1) sql.append(",");
            }
            sql.append(") ");
        }
        sql.append("ORDER BY i.prb_usage DESC ");
        sql.append("LIMIT ").append(limit);

        return sqlExecutorService.execute(sql.toString(), limit);
    }

    public Nl2SqlResponse compareIndicators(
            String operatorName, String siteCode,
            LocalDateTime currentTime, LocalDateTime compareTime,
            String[] indicators) {
        long startTime = System.currentTimeMillis();

        try {
            List<Map<String, Object>> currentResults = getIndicatorsByTime(
                    operatorName, siteCode, currentTime, 1000);
            List<Map<String, Object>> compareResults = getIndicatorsByTime(
                    operatorName, siteCode, compareTime, 1000);

            List<Map<String, Object>> enrichedCurrent = enrichWithChangeRate(currentResults, compareResults);

            Nl2SqlResponse.QueryMeta meta = Nl2SqlResponse.QueryMeta.builder()
                    .startTime(compareTime)
                    .endTime(currentTime)
                    .isCompare(true)
                    .comparePeriod(formatPeriod(currentTime, compareTime))
                    .indicators(indicators)
                    .build();

            return Nl2SqlResponse.builder()
                    .results(enrichedCurrent)
                    .compareResults(compareResults)
                    .rowCount(enrichedCurrent.size())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .status("success")
                    .meta(meta)
                    .build();

        } catch (Exception e) {
            return Nl2SqlResponse.builder()
                    .status("error")
                    .errorMessage(e.getMessage())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    public Nl2SqlResponse compareIndicatorsByMonth(
            String operatorName, String siteCode,
            YearMonth currentMonth, YearMonth compareMonth,
            String[] indicators) {
        long startTime = System.currentTimeMillis();

        try {
            List<Map<String, Object>> currentResults = getIndicatorsByMonth(
                    operatorName, siteCode, currentMonth, 1000);
            List<Map<String, Object>> compareResults = getIndicatorsByMonth(
                    operatorName, siteCode, compareMonth, 1000);

            List<Map<String, Object>> enrichedCurrent = enrichWithChangeRate(currentResults, compareResults);

            Nl2SqlResponse.QueryMeta meta = Nl2SqlResponse.QueryMeta.builder()
                    .isCompare(true)
                    .comparePeriod(currentMonth.format(YEAR_MONTH_FORMATTER) + " vs " + compareMonth.format(YEAR_MONTH_FORMATTER))
                    .indicators(indicators)
                    .build();

            return Nl2SqlResponse.builder()
                    .results(enrichedCurrent)
                    .compareResults(compareResults)
                    .rowCount(enrichedCurrent.size())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .status("success")
                    .meta(meta)
                    .build();

        } catch (Exception e) {
            return Nl2SqlResponse.builder()
                    .status("error")
                    .errorMessage(e.getMessage())
                    .executionTimeMs(System.currentTimeMillis() - startTime)
                    .build();
        }
    }

    private List<Map<String, Object>> getIndicatorsByTime(
            String operatorName, String siteCode, LocalDateTime dataTime, int limit) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT i.*, s.site_name, s.band, o.operator_name ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE i.data_time = '").append(dataTime.format(DATETIME_FORMATTER)).append("' ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (siteCode != null && !siteCode.isBlank()) {
            sql.append("AND s.site_code = '").append(siteCode).append("' ");
        }
        sql.append("LIMIT ").append(limit);

        return sqlExecutorService.execute(sql.toString(), limit);
    }

    private List<Map<String, Object>> getIndicatorsByMonth(
            String operatorName, String siteCode, YearMonth month, int limit) {
        String yearMonth = month.format(YEAR_MONTH_FORMATTER);
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT i.*, s.site_name, s.band, o.operator_name, ");
        sql.append("DATE_FORMAT(i.data_time, '%Y-%m') as data_month ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE DATE_FORMAT(i.data_time, '%Y-%m') = '").append(yearMonth).append("' ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (siteCode != null && !siteCode.isBlank()) {
            sql.append("AND s.site_code = '").append(siteCode).append("' ");
        }
        sql.append("ORDER BY i.data_time DESC ");
        sql.append("LIMIT ").append(limit);

        return sqlExecutorService.execute(sql.toString(), limit);
    }

    private List<Map<String, Object>> enrichWithChangeRate(
            List<Map<String, Object>> current, List<Map<String, Object>> compare) {
        Map<String, Map<String, Object>> compareMap = new HashMap<>();
        for (Map<String, Object> row : compare) {
            compareMap.put((String) row.get("cell_id"), row);
        }

        List<Map<String, Object>> enriched = new ArrayList<>();
        for (Map<String, Object> curr : current) {
            Map<String, Object> enrichedRow = new HashMap<>(curr);
            Map<String, Object> comp = compareMap.get(curr.get("cell_id"));

            if (comp != null) {
                enrichedRow.put("dl_rate_change",
                        calcChangeRate(toDouble(curr.get("dl_rate")), toDouble(comp.get("dl_rate"))));
                enrichedRow.put("ul_rate_change",
                        calcChangeRate(toDouble(curr.get("ul_rate")), toDouble(comp.get("ul_rate"))));
                enrichedRow.put("prb_usage_change",
                        calcChangeRate(toDouble(curr.get("prb_usage")), toDouble(comp.get("prb_usage"))));
                enrichedRow.put("split_ratio_change",
                        calcChangeRate(toDouble(curr.get("split_ratio")), toDouble(comp.get("split_ratio"))));
            }
            enriched.add(enrichedRow);
        }
        return enriched;
    }

    private Double calcChangeRate(Double current, Double previous) {
        if (current == null || previous == null || previous == 0) {
            return null;
        }
        return Math.round((current - previous) / previous * 10000.0) / 100.0;
    }

    private Double toDouble(Object obj) {
        if (obj == null) return null;
        if (obj instanceof Number) return ((Number) obj).doubleValue();
        try {
            return Double.parseDouble(obj.toString());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private String formatPeriod(LocalDateTime current, LocalDateTime previous) {
        long days = java.time.Duration.between(previous, current).toDays();
        if (days == 0) return "same_day";
        if (days == 1) return "1_day";
        if (days == 7) return "1_week";
        if (days == 30) return "1_month";
        return days + "_days";
    }

    public List<Map<String, Object>> getTrendData(
            String operatorName, String siteCode, String cellId,
            String indicator, LocalDateTime startTime, LocalDateTime endTime, int limit) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT i.data_time, i.cell_id, i.cell_name, s.site_name, o.operator_name, ");
        sql.append("i.dl_rate, i.ul_rate, i.prb_usage, i.split_ratio, i.main_ratio, s.band ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE i.data_time BETWEEN '").append(startTime.format(DATETIME_FORMATTER))
                .append("' AND '").append(endTime.format(DATETIME_FORMATTER)).append("' ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (siteCode != null && !siteCode.isBlank()) {
            sql.append("AND s.site_code = '").append(siteCode).append("' ");
        }
        if (cellId != null && !cellId.isBlank()) {
            sql.append("AND i.cell_id = '").append(cellId).append("' ");
        }
        sql.append("ORDER BY i.data_time ASC ");
        sql.append("LIMIT ").append(limit);

        return sqlExecutorService.execute(sql.toString(), limit);
    }

    public List<Map<String, Object>> getAvailableTimes(String operatorName, String siteCode) {
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT DISTINCT DATE_FORMAT(i.data_time, '%Y-%m') as year_month, ");
        sql.append("COUNT(*) as record_count, ");
        sql.append("MIN(i.data_time) as first_record, ");
        sql.append("MAX(i.data_time) as last_record ");
        sql.append("FROM indicator_info i ");
        sql.append("JOIN site_info s ON i.site_id = s.id ");
        sql.append("JOIN operator_info o ON s.operator_id = o.id ");
        sql.append("WHERE 1=1 ");

        if (operatorName != null && !operatorName.isBlank()) {
            sql.append("AND o.operator_name = '").append(operatorName).append("' ");
        }
        if (siteCode != null && !siteCode.isBlank()) {
            sql.append("AND s.site_code = '").append(siteCode).append("' ");
        }
        sql.append("GROUP BY year_month ORDER BY year_month DESC LIMIT 100");

        return sqlExecutorService.execute(sql.toString(), 100);
    }

    private boolean isSqlSafe(String sql) {
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
}
