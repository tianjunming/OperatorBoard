package com.operator.nl2sql.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class SiteInfo {
    private Long id;
    private Long operatorId;
    private String siteName;
    private String siteCode;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String band;
    private LocalDateTime createdAt;
}
