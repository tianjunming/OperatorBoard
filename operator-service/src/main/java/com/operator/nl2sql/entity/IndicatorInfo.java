package com.operator.nl2sql.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class IndicatorInfo {
    private Long id;
    private Long siteId;
    private String cellId;
    private String cellName;
    private String frequencyBand;
    private BigDecimal dlRate;
    private BigDecimal ulRate;
    private BigDecimal prbUsage;
    private BigDecimal splitRatio;
    private BigDecimal mainRatio;
    private LocalDateTime dataTime;
    private LocalDateTime createdAt;
}
