package com.operator.nl2sql.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * 运营商级别汇总指标响应
 * 包含分流比、驻留比、终端渗透率等指标
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OperatorMetricsResponse {

    private Long operatorId;
    private String operatorName;
    private String dataMonth;

    // 分流比
    private BigDecimal trafficRatio;
    private String trafficRatioDesc;

    // 时长驻留比
    private BigDecimal durationCampRatio;
    private String durationCampRatioDesc;

    // 终端渗透率
    private BigDecimal terminalPenetration;
    private String terminalPenetrationDesc;

    // 回流比
    private BigDecimal fallbackRatio;
    private String fallbackRatioDesc;

    // LTE平均指标
    private BigDecimal lteAvgDlRate;
    private BigDecimal lteAvgUlRate;
    private BigDecimal lteAvgDlPrb;
    private BigDecimal lteAvgUlPrb;

    // NR平均指标
    private BigDecimal nrAvgDlRate;
    private BigDecimal nrAvgUlRate;
    private BigDecimal nrAvgDlPrb;
    private BigDecimal nrAvgUlPrb;
}