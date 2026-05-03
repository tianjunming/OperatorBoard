package com.operator.nl2sql.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * 运营商汇总表 (operator_summary)
 * 每行 = 1运营商 × 1月份 × 1技术制式
 * 包含物理站点数、物理小区数、平均速率、平均PRB等汇总指标
 */
@Data
public class OperatorSummary {
    private Long id;
    private Long operatorId;
    private String operatorName;
    private String dataMonth;
    private String technology;  // LTE/NR/ALL

    // 物理小区数
    private Integer nrPhysicalCellNum;
    private Integer ltePhysicalCellNum;

    // 物理站点数
    private Integer ltePhysicalSiteNum;
    private Integer nrPhysicalSiteNum;

    // 总计
    private Integer totalSiteNum;
    private Integer totalCellNum;

    // 用户指标
    private BigDecimal onlineUsers;
    private BigDecimal nrUsers;

    // 终端指标
    private BigDecimal terminalPenetrationRatio;

    // LTE指标
    private BigDecimal lteAvgDlRate;
    private BigDecimal lteAvgUlRate;
    private BigDecimal lteAvgDlPrb;
    private BigDecimal lteAvgUlPrb;

    // NR指标
    private BigDecimal nrAvgDlRate;
    private BigDecimal nrAvgUlRate;
    private BigDecimal nrAvgDlPrb;
    private BigDecimal nrAvgUlPrb;

    // 分流/驻留指标
    private BigDecimal trafficRatio;
    private BigDecimal durationCampratio;
    private BigDecimal fallbackRatio;
}