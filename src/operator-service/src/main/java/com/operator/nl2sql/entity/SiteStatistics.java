package com.operator.nl2sql.entity;

import lombok.Data;

/**
 * 站点信息表
 * Star Schema: Site and Cell Information Table
 */
@Data
public class SiteStatistics {
    private Long id;
    private Long operatorId;
    private Long bandId;
    private String bandName;   // 频段名称 如 LTE 700M FDD
    private String dataMonth;  // YYYY-MM
    private Integer siteNum;
    private Integer cellNum;
    private String technology;  // LTE/NR

    // 导航属性 (非数据库字段)
    private OperatorInfo operator;
    private BandInfo band;
}
