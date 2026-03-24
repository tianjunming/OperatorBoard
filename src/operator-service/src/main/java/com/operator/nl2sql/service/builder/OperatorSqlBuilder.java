package com.operator.nl2sql.service.builder;

import org.springframework.stereotype.Component;

import java.util.StringJoiner;

/**
 * 运营商和站点信息SQL构建器
 * 基于宽表结构: site_info (每行=1运营商×1月份)
 */
@Component
public class OperatorSqlBuilder implements SqlBuilder {

    private static final String SITE_TABLE = "site_info";
    private static final String OPERATOR_TABLE = "operator_info";

    // LTE频段列表
    private static final String[] LTE_BANDS = {"700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M"};

    // NR频段列表
    private static final String[] NR_BANDS = {"700M", "800M", "900M", "1400M", "1800M", "2100M", "2600M", "3500M", "4900M", "2300M"};

    @Override
    public String getTableName() {
        return SITE_TABLE;
    }

    @Override
    public String buildSelectSql() {
        return "SELECT * FROM " + SITE_TABLE + " ORDER BY operator_id, data_month";
    }

    @Override
    public String buildSelectSql(String condition) {
        if (condition == null || condition.isBlank()) {
            return buildSelectSql();
        }
        return "SELECT * FROM " + SITE_TABLE + " WHERE " + condition + " ORDER BY operator_id, data_month";
    }

    /**
     * 查询所有运营商信息
     */
    public String buildAllOperators() {
        return "SELECT * FROM " + OPERATOR_TABLE + " ORDER BY id";
    }

    /**
     * 根据ID查询运营商
     */
    public String buildOperatorById(Long operatorId) {
        return "SELECT * FROM " + OPERATOR_TABLE + " WHERE id = " + operatorId;
    }

    /**
     * 根据运营商名称查询
     */
    public String buildOperatorByName(String operatorName) {
        return "SELECT * FROM " + OPERATOR_TABLE + " WHERE operator_name = '" + operatorName + "'";
    }

    /**
     * 查询所有站点汇总信息
     */
    public String buildAllSiteSummary() {
        return "SELECT s.operator_id, s.data_month, " +
               buildAllSiteColumns() + ", " +
               "o.operator_name " +
               "FROM " + SITE_TABLE + " s " +
               "JOIN " + OPERATOR_TABLE + " o ON s.operator_id = o.id " +
               "ORDER BY s.operator_id, s.data_month";
    }

    /**
     * 根据运营商ID查询站点汇总
     */
    public String buildSiteSummaryByOperatorId(Long operatorId) {
        return "SELECT s.operator_id, s.data_month, " +
               buildAllSiteColumns() + " " +
               "FROM " + SITE_TABLE + " s " +
               "WHERE s.operator_id = " + operatorId + " " +
               "ORDER BY s.data_month";
    }

    /**
     * 根据运营商ID和月份查询
     */
    public String buildSiteSummaryByOperatorIdAndMonth(Long operatorId, String dataMonth) {
        return "SELECT s.operator_id, s.data_month, " +
               buildAllSiteColumns() + " " +
               "FROM " + SITE_TABLE + " s " +
               "WHERE s.operator_id = " + operatorId + " AND s.data_month = '" + dataMonth + "'";
    }

    /**
     * 查询指定月份的站点汇总（含运营商名称）
     */
    public String buildSiteSummaryByMonth(String dataMonth) {
        return "SELECT s.operator_id, s.data_month, " +
               buildAllSiteColumns() + ", " +
               "o.operator_name " +
               "FROM " + SITE_TABLE + " s " +
               "JOIN " + OPERATOR_TABLE + " o ON s.operator_id = o.id " +
               "WHERE s.data_month = '" + dataMonth + "' " +
               "ORDER BY s.operator_id";
    }

    /**
     * 查询指定月份和频段的站点信息
     */
    public String buildSiteSummaryByBand(String dataMonth, String networkType, String band) {
        String siteColumn = networkType.toLowerCase() + "_" + band.toLowerCase().replace("m", "m") + "_site";
        String cellColumn = networkType.toLowerCase() + "_" + band.toLowerCase().replace("m", "m") + "_cell";

        return "SELECT s.operator_id, s.data_month, " +
               siteColumn + " AS site_count, " +
               cellColumn + " AS cell_count, " +
               "o.operator_name " +
               "FROM " + SITE_TABLE + " s " +
               "JOIN " + OPERATOR_TABLE + " o ON s.operator_id = o.id " +
               "WHERE s.data_month = '" + dataMonth + "' " +
               "ORDER BY s.operator_id";
    }

    /**
     * 构建所有站点字段列表
     */
    private String buildAllSiteColumns() {
        StringJoiner joiner = new StringJoiner(", ");

        // LTE频段字段
        for (String band : LTE_BANDS) {
            String prefix = "lte_" + band.toLowerCase().replace("m", "m");
            joiner.add(prefix + "_site");
            joiner.add(prefix + "_cell");
        }

        // NR频段字段
        for (String band : NR_BANDS) {
            String prefix = "nr_" + band.toLowerCase().replace("m", "m");
            joiner.add(prefix + "_site");
            joiner.add(prefix + "_cell");
        }

        // 汇总字段
        joiner.add("lte_total_site");
        joiner.add("lte_total_cell");
        joiner.add("nr_total_site");
        joiner.add("nr_total_cell");

        return joiner.toString();
    }

    /**
     * 构建指定频段的站点字段
     */
    public String buildBandColumns(String networkType, String band) {
        String prefix = networkType.toLowerCase() + "_" + band.toLowerCase().replace("m", "m");
        return prefix + "_site, " + prefix + "_cell";
    }
}