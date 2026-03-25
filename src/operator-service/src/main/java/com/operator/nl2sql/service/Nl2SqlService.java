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
        String dataTimeStr = dataTime != null ? dataTime.format(DATETIME_FORMATTER) : null;
        return sqlExecutorService.getIndicators(operatorName, siteCode, dataTimeStr, limit);
    }

    public List<Map<String, Object>> getLatestIndicators(
            String operatorName, String[] frequencyBands, int limit) {
        return sqlExecutorService.getLatestIndicators(operatorName, frequencyBands, limit);
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
        String dataTimeStr = dataTime.format(DATETIME_FORMATTER);
        return sqlExecutorService.getIndicatorsByTime(operatorName, siteCode, dataTimeStr, limit);
    }

    private List<Map<String, Object>> getIndicatorsByMonth(
            String operatorName, String siteCode, YearMonth month, int limit) {
        String yearMonth = month.format(YEAR_MONTH_FORMATTER);
        return sqlExecutorService.getIndicatorsByMonth(operatorName, siteCode, yearMonth, limit);
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
        String startTimeStr = startTime.format(DATETIME_FORMATTER);
        String endTimeStr = endTime.format(DATETIME_FORMATTER);
        return sqlExecutorService.getTrendData(operatorName, siteCode, cellId, startTimeStr, endTimeStr, limit);
    }

    public List<Map<String, Object>> getAvailableTimes(String operatorName, String siteCode) {
        return sqlExecutorService.getAvailableTimes(operatorName, siteCode, 100);
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
