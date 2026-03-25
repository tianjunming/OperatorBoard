package com.operator.nl2sql.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.atomic.AtomicReference;

@Component
public class SchemaCache {

    private final AtomicReference<String> schemaContext = new AtomicReference<>();

    private final SqlCoderConfig sqlCoderConfig;

    @Value("${nl2sql.schema.refresh-enabled:false}")
    private boolean refreshEnabled;

    public SchemaCache(SqlCoderConfig sqlCoderConfig) {
        this.sqlCoderConfig = sqlCoderConfig;
    }

    @PostConstruct
    public void init() {
        refreshSchema();
    }

    /**
     * Scheduled schema refresh using cron expression from config.
     * Default cron: "0 0 * * * *" (every hour at minute 0)
     * Can be disabled via nl2sql.schema.refresh-enabled=false
     */
    @Scheduled(cron = "${nl2sql.schema.refresh-cron:0 0 * * * *}")
    public void scheduledRefresh() {
        if (refreshEnabled) {
            refreshSchema();
        }
    }

    /**
     * Manually trigger schema refresh.
     * Thread-safe operation using AtomicReference.
     */
    public synchronized void refreshSchema() {
        StringBuilder sb = new StringBuilder();
        sb.append("# Database Schema\n\n");

        sb.append("## operator_info (运营商信息表)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| id | BIGINT | 主键 |\n");
        sb.append("| operator_name | VARCHAR(100) | 运营商名称 |\n");
        sb.append("| country | VARCHAR(50) | 国家名称 |\n");
        sb.append("| region | VARCHAR(100) | 地区 |\n");
        sb.append("| network_type | VARCHAR(50) | 网络类型 (4G/5G) |\n");
        sb.append("| data_month | VARCHAR(7) | 数据月份 (YYYY-MM) |\n");
        sb.append("| created_time | DATETIME | 创建时间 |\n");
        sb.append("| updated_time | DATETIME | 更新时间 |\n\n");

        sb.append("## site_info (站点信息表-宽表)\n");
        sb.append("每行 = 1个运营商 × 1个月\n\n");
        sb.append("### LTE 频段字段 (站点/小区)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| lte_700M_site | INT | LTE 700M 物理站点数 |\n");
        sb.append("| lte_700M_cell | INT | LTE 700M 物理小区数 |\n");
        sb.append("| lte_800M_site | INT | LTE 800M 物理站点数 |\n");
        sb.append("| lte_800M_cell | INT | LTE 800M 物理小区数 |\n");
        sb.append("| lte_900M_site | INT | LTE 900M 物理站点数 |\n");
        sb.append("| lte_900M_cell | INT | LTE 900M 物理小区数 |\n");
        sb.append("| lte_1400M_site | INT | LTE 1400M 物理站点数 |\n");
        sb.append("| lte_1400M_cell | INT | LTE 1400M 物理小区数 |\n");
        sb.append("| lte_1800M_site | INT | LTE 1800M 物理站点数 |\n");
        sb.append("| lte_1800M_cell | INT | LTE 1800M 物理小区数 |\n");
        sb.append("| lte_2100M_site | INT | LTE 2100M 物理站点数 |\n");
        sb.append("| lte_2100M_cell | INT | LTE 2100M 物理小区数 |\n");
        sb.append("| lte_2600M_site | INT | LTE 2600M 物理站点数 |\n");
        sb.append("| lte_2600M_cell | INT | LTE 2600M 物理小区数 |\n\n");

        sb.append("### NR 频段字段 (站点/小区)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| nr_700M_site | INT | NR 700M 物理站点数 |\n");
        sb.append("| nr_700M_cell | INT | NR 700M 物理小区数 |\n");
        sb.append("| nr_800M_site | INT | NR 800M 物理站点数 |\n");
        sb.append("| nr_800M_cell | INT | NR 800M 物理小区数 |\n");
        sb.append("| nr_900M_site | INT | NR 900M 物理站点数 |\n");
        sb.append("| nr_900M_cell | INT | NR 900M 物理小区数 |\n");
        sb.append("| nr_1400M_site | INT | NR 1400M 物理站点数 |\n");
        sb.append("| nr_1400M_cell | INT | NR 1400M 物理小区数 |\n");
        sb.append("| nr_1800M_site | INT | NR 1800M 物理站点数 |\n");
        sb.append("| nr_1800M_cell | INT | NR 1800M 物理小区数 |\n");
        sb.append("| nr_2100M_site | INT | NR 2100M 物理站点数 |\n");
        sb.append("| nr_2100M_cell | INT | NR 2100M 物理小区数 |\n");
        sb.append("| nr_2600M_site | INT | NR 2600M 物理站点数 |\n");
        sb.append("| nr_2600M_cell | INT | NR 2600M 物理小区数 |\n");
        sb.append("| nr_3500M_site | INT | NR 3500M 物理站点数 |\n");
        sb.append("| nr_3500M_cell | INT | NR 3500M 物理小区数 |\n");
        sb.append("| nr_4900M_site | INT | NR 4900M 物理站点数 |\n");
        sb.append("| nr_4900M_cell | INT | NR 4900M 物理小区数 |\n");
        sb.append("| nr_2300M_site | INT | NR 2300M 物理站点数 |\n");
        sb.append("| nr_2300M_cell | INT | NR 2300M 物理小区数 |\n\n");

        sb.append("### 汇总字段\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| lte_total_site | INT | LTE物理站点总数 |\n");
        sb.append("| lte_total_cell | INT | LTE物理小区总数 |\n");
        sb.append("| nr_total_site | INT | NR物理站点总数 |\n");
        sb.append("| nr_total_cell | INT | NR物理小区总数 |\n\n");

        sb.append("## indicator_info (指标信息表-宽表)\n");
        sb.append("每行 = 1个运营商 × 1个月\n\n");

        sb.append("### LTE 频段指标 (每个频段4个指标: dl_rate, ul_rate, dl_prb, ul_prb)\n");
        sb.append("- LTE 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M\n\n");

        sb.append("### NR 频段指标 (每个频段4个指标: dl_rate, ul_rate, dl_prb, ul_prb)\n");
        sb.append("- NR 700M, 800M, 900M, 1400M, 1800M, 2100M, 2600M, 3500M, 4900M, 2300M\n\n");

        sb.append("### 汇总指标\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| lte_avg_dl_rate | DECIMAL(10,2) | LTE 平均下行速率 (Mbps) |\n");
        sb.append("| lte_avg_prb | DECIMAL(5,2) | LTE 平均PRB利用率 (%) |\n");
        sb.append("| nr_avg_dl_rate | DECIMAL(10,2) | NR 平均下行速率 (Mbps) |\n");
        sb.append("| nr_avg_prb | DECIMAL(5,2) | NR 平均PRB利用率 (%) |\n");
        sb.append("| split_ratio | DECIMAL(5,2) | 分流比 (%) |\n");
        sb.append("| dwell_ratio | DECIMAL(5,2) | 驻留比 (%) |\n");
        sb.append("| terminal_penetration | DECIMAL(5,2) | 终端渗透率 (%) |\n");
        sb.append("| duration_dwell_ratio | DECIMAL(5,2) | 时长驻留比 (%) |\n");
        sb.append("| fallback_ratio | DECIMAL(5,2) | 回流比 (%) |\n");

        this.schemaContext.set(sb.toString());
    }

    public String getSchemaContext() {
        return schemaContext.get();
    }
}