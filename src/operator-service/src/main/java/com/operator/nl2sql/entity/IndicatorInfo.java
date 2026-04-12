package com.operator.nl2sql.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class IndicatorInfo {
    private Long id;
    private Long operatorId;
    private String dataMonth;

    // LTE 频段指标
    private BigDecimal lte700MDlRate;
    private BigDecimal lte700MUlRate;
    private BigDecimal lte700MDlPrb;
    private BigDecimal lte700MUlPrb;

    private BigDecimal lte800MDlRate;
    private BigDecimal lte800MUlRate;
    private BigDecimal lte800MDlPrb;
    private BigDecimal lte800MUlPrb;

    private BigDecimal lte900MDlRate;
    private BigDecimal lte900MUlRate;
    private BigDecimal lte900MDlPrb;
    private BigDecimal lte900MUlPrb;

    private BigDecimal lte1400MDlRate;
    private BigDecimal lte1400MUlRate;
    private BigDecimal lte1400MDlPrb;
    private BigDecimal lte1400MUlPrb;

    private BigDecimal lte1800MDlRate;
    private BigDecimal lte1800MUlRate;
    private BigDecimal lte1800MDlPrb;
    private BigDecimal lte1800MUlPrb;

    private BigDecimal lte2100MDlRate;
    private BigDecimal lte2100MUlRate;
    private BigDecimal lte2100MDlPrb;
    private BigDecimal lte2100MUlPrb;

    private BigDecimal lte2600MDlRate;
    private BigDecimal lte2600MUlRate;
    private BigDecimal lte2600MDlPrb;
    private BigDecimal lte2600MUlPrb;

    // NR 频段指标
    private BigDecimal nr700MDlRate;
    private BigDecimal nr700MUlRate;
    private BigDecimal nr700MDlPrb;
    private BigDecimal nr700MUlPrb;

    private BigDecimal nr800MDlRate;
    private BigDecimal nr800MUlRate;
    private BigDecimal nr800MDlPrb;
    private BigDecimal nr800MUlPrb;

    private BigDecimal nr900MDlRate;
    private BigDecimal nr900MUlRate;
    private BigDecimal nr900MDlPrb;
    private BigDecimal nr900MUlPrb;

    private BigDecimal nr1400MDlRate;
    private BigDecimal nr1400MUlRate;
    private BigDecimal nr1400MDlPrb;
    private BigDecimal nr1400MUlPrb;

    private BigDecimal nr1800MDlRate;
    private BigDecimal nr1800MUlRate;
    private BigDecimal nr1800MDlPrb;
    private BigDecimal nr1800MUlPrb;

    private BigDecimal nr2100MDlRate;
    private BigDecimal nr2100MUlRate;
    private BigDecimal nr2100MDlPrb;
    private BigDecimal nr2100MUlPrb;

    private BigDecimal nr2600MDlRate;
    private BigDecimal nr2600MUlRate;
    private BigDecimal nr2600MDlPrb;
    private BigDecimal nr2600MUlPrb;

    private BigDecimal nr3500MDlRate;
    private BigDecimal nr3500MUlRate;
    private BigDecimal nr3500MDlPrb;
    private BigDecimal nr3500MUlPrb;

    private BigDecimal nr4900MDlRate;
    private BigDecimal nr4900MUlRate;
    private BigDecimal nr4900MDlPrb;
    private BigDecimal nr4900MUlPrb;

    private BigDecimal nr2300MDlRate;
    private BigDecimal nr2300MUlRate;
    private BigDecimal nr2300MDlPrb;
    private BigDecimal nr2300MUlPrb;

    // 汇总指标
    private BigDecimal lteAvgDlRate;
    private BigDecimal lteAvgUlRate;
    private BigDecimal lteAvgDlPrb;
    private BigDecimal lteAvgUlPrb;
    private BigDecimal nrAvgDlRate;
    private BigDecimal nrAvgUlRate;
    private BigDecimal nrAvgDlPrb;
    private BigDecimal nrAvgUlPrb;
    private BigDecimal trafficRatio;
    private BigDecimal trafficCampratio;
    private BigDecimal terminalPenetration;
    private BigDecimal durationCampratio;
    private BigDecimal fallbackRatio;

    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}