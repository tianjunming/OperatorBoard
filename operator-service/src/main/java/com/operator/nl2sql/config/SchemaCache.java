package com.operator.nl2sql.config;

import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.util.StringJoiner;

@Component
public class SchemaCache {

    private String schemaContext;

    private final SqlCoderConfig sqlCoderConfig;

    public SchemaCache(SqlCoderConfig sqlCoderConfig) {
        this.sqlCoderConfig = sqlCoderConfig;
    }

    @PostConstruct
    public void init() {
        refreshSchema();
    }

    public void refreshSchema() {
        StringBuilder sb = new StringBuilder();
        sb.append("# Database Schema\n\n");

        sb.append("## operator_info (运营商信息表)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| id | BIGINT | 主键 |\n");
        sb.append("| operator_name | VARCHAR(100) | 运营商名称 |\n");
        sb.append("| region | VARCHAR(100) | 地区 |\n");
        sb.append("| network_type | VARCHAR(50) | 网络类型 (4G/5G) |\n");
        sb.append("| created_at | DATETIME | 创建时间 |\n\n");

        sb.append("## site_info (基站信息表)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| id | BIGINT | 主键 |\n");
        sb.append("| operator_id | BIGINT | 外键关联operator_info.id |\n");
        sb.append("| site_name | VARCHAR(200) | 基站名称 |\n");
        sb.append("| site_code | VARCHAR(100) | 基站编码(唯一) |\n");
        sb.append("| longitude | DECIMAL(10,6) | 经度 |\n");
        sb.append("| latitude | DECIMAL(10,6) | 纬度 |\n");
        sb.append("| band | VARCHAR(50) | 频段(700MHz/2.6GHz/3.5GHz) |\n");
        sb.append("| created_at | DATETIME | 创建时间 |\n\n");

        sb.append("## indicator_info (指标信息表)\n");
        sb.append("| Column | Type | Description |\n");
        sb.append("|--------|------|-------------|\n");
        sb.append("| id | BIGINT | 主键 |\n");
        sb.append("| site_id | BIGINT | 外键关联site_info.id |\n");
        sb.append("| cell_id | VARCHAR(100) | 小区ID |\n");
        sb.append("| cell_name | VARCHAR(200) | 小区名称 |\n");
        sb.append("| frequency_band | VARCHAR(50) | 频段 |\n");
        sb.append("| dl_rate | DECIMAL(10,2) | 下行速率(Mbps) |\n");
        sb.append("| ul_rate | DECIMAL(10,2) | 上行速率(Mbps) |\n");
        sb.append("| prb_usage | DECIMAL(5,2) | PRB利用率(%) |\n");
        sb.append("| split_ratio | DECIMAL(5,2) | 分流比(%) |\n");
        sb.append("| main_ratio | DECIMAL(5,2) | 主流比(%) |\n");
        sb.append("| data_time | DATETIME | 数据时间 |\n");
        sb.append("| created_at | DATETIME | 创建时间 |\n");

        this.schemaContext = sb.toString();
    }

    public String getSchemaContext() {
        return schemaContext;
    }
}
