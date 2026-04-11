package com.operator.nl2sql.entity;

import lombok.Data;

/**
 * 运营商站点汇总表
 * Star Schema: Aggregation Table by Technology
 */
@Data
public class OperatorTotalSite {
    private Long id;
    private Long operatorId;
    private String dataMonth;  // YYYY-MM
    private String technology;  // LTE/NR/ALL

    // LTE物理站点和小区数（确定值，非汇总）
    private Integer ltePhysicalSiteNum;
    private Integer ltePhysicalCellNum;

    // NR物理站点和小区数（确定值，非汇总）
    private Integer nrPhysicalSiteNum;
    private Integer nrPhysicalCellNum;

    // 总计
    private Integer totalSiteNum;
    private Integer totalCellNum;

    // 导航属性
    private OperatorInfo operator;
}
