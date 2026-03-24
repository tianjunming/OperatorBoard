package com.operator.nl2sql.service.builder;

import org.springframework.stereotype.Component;

import java.util.StringJoiner;

/**
 * 指标信息SQL构建器
 * 基于宽表结构: indicator_info (每行=1运营商×1月份)
 */
@Component
public class IndicatorSqlBuilder implements SqlBuilder {

    private static final String TABLE_NAME = "indicator_info";

    // LTE频段列表
    private static final String[] LTE_BANDS = {"700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M"};

    // NR频段列表
    private static final String[] NR_BANDS = {"700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M", "3500M", "4900M", "2300M"};

    @Override
    public String getTableName() {
        return TABLE_NAME;
    }

    @Override
    public String buildSelectSql() {
        return "SELECT * FROM " + TABLE_NAME + " ORDER BY operator_id, data_month";
    }

    @Override
    public String buildSelectSql(String condition) {
        if (condition == null || condition.isBlank()) {
            return buildSelectSql();
        }
        return "SELECT * FROM " + TABLE_NAME + " WHERE " + condition + " ORDER BY operator_id, data_month";
    }

    /**
     * 根据运营商ID查询
     */
    public String buildByOperatorId(Long operatorId) {
        return buildSelectSql("operator_id = " + operatorId);
    }

    /**
     * 根据运营商ID和月份查询
     */
    public String buildByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return buildSelectSql("operator_id = " + operatorId + " AND data_month = '" + dataMonth + "'");
    }

    /**
     * 查询所有运营商最新数据
     */
    public String buildLatestForAllOperators() {
        return "SELECT i.* FROM " + TABLE_NAME + " i " +
               "WHERE i.data_month = (SELECT MAX(i2.data_month) FROM " + TABLE_NAME + " i2 WHERE i2.operator_id = i.operator_id) " +
               "ORDER BY i.operator_id, i.data_month";
    }

    /**
     * 查询指定运营商最新数据
     */
    public String buildLatestByOperatorId(Long operatorId) {
        return "SELECT * FROM " + TABLE_NAME + " " +
               "WHERE operator_id = " + operatorId + " " +
               "AND data_month = (SELECT MAX(data_month) FROM " + TABLE_NAME + " WHERE operator_id = " + operatorId + ")";
    }

    /**
     * 查询运营商趋势数据（按月份排序）
     */
    public String buildTrendByOperatorId(Long operatorId) {
        return "SELECT * FROM " + TABLE_NAME + " " +
               "WHERE operator_id = " + operatorId + " " +
               "ORDER BY data_month ASC";
    }

    /**
     * 查询指定月份的汇总指标
     */
    public String buildSummaryByMonth(String dataMonth) {
        return "SELECT operator_id, data_month, " +
               "lte_avg_dl_rate, lte_avg_prb, nr_avg_dl_rate, nr_avg_prb, " +
               "split_ratio, dwell_ratio, terminal_penetration, duration_dwell_ratio, fallback_ratio " +
               "FROM " + TABLE_NAME + " " +
               "WHERE data_month = '" + dataMonth + "' " +
               "ORDER BY operator_id";
    }

    /**
     * 查询指定运营商的指定频段指标
     */
    public String buildBandIndicator(Long operatorId, String dataMonth, String networkType, String band) {
        String column = networkType.toLowerCase() + "_" + band.toLowerCase().replace("m", "m");
        StringBuilder sql = new StringBuilder();
        sql.append("SELECT operator_id, data_month, ");
        sql.append(column).append("_dl_rate AS dl_rate, ");
        sql.append(column).append("_ul_rate AS ul_rate, ");
        sql.append(column).append("_dl_prb AS dl_prb, ");
        sql.append(column).append("_ul_prb AS ul_prb ");
        sql.append("FROM ").append(TABLE_NAME).append(" ");
        sql.append("WHERE 1=1 ");

        if (operatorId != null) {
            sql.append("AND operator_id = ").append(operatorId).append(" ");
        }
        if (dataMonth != null && !dataMonth.isBlank()) {
            sql.append("AND data_month = '").append(dataMonth).append("' ");
        }
        sql.append("ORDER BY operator_id, data_month");
        return sql.toString();
    }

    /**
     * 构建字段列表（用于动态SQL）
     */
    public String buildAllColumns() {
        StringJoiner joiner = new StringJoiner(", ");

        // LTE频段字段
        for (String band : LTE_BANDS) {
            String prefix = "lte_" + band.toLowerCase().replace("m", "m");
            joiner.add(prefix + "_dl_rate");
            joiner.add(prefix + "_ul_rate");
            joiner.add(prefix + "_dl_prb");
            joiner.add(prefix + "_ul_prb");
        }

        // NR频段字段
        for (String band : NR_BANDS) {
            String prefix = "nr_" + band.toLowerCase().replace("m", "m");
            joiner.add(prefix + "_dl_rate");
            joiner.add(prefix + "_ul_rate");
            joiner.add(prefix + "_dl_prb");
            joiner.add(prefix + "_ul_prb");
        }

        // 汇总字段
        joiner.add("lte_avg_dl_rate");
        joiner.add("lte_avg_prb");
        joiner.add("nr_avg_dl_rate");
        joiner.add("nr_avg_prb");
        joiner.add("split_ratio");
        joiner.add("dwell_ratio");
        joiner.add("terminal_penetration");
        joiner.add("duration_dwell_ratio");
        joiner.add("fallback_ratio");

        return joiner.toString();
    }

    /**
     * 构建频段字段列表
     */
    public String buildBandColumns(String networkType, String band) {
        String prefix = networkType.toLowerCase() + "_" + band.toLowerCase().replace("m", "m");
        return prefix + "_dl_rate, " + prefix + "_ul_rate, " + prefix + "_dl_prb, " + prefix + "_ul_prb";
    }
}