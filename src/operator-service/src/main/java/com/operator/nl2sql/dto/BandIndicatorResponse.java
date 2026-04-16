package com.operator.nl2sql.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BandIndicatorResponse {

    private Long operatorId;
    private String operatorName;
    private String band;
    private String networkType;
    private String dataMonth;

    // 速率 (Mbps)
    private BigDecimal dlRate;
    private BigDecimal ulRate;

    // PRB利用率
    private BigDecimal dlPrb;
    private BigDecimal ulPrb;

    // 用于同时返回多条记录（不区分networkType时）
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class BandIndicatorListResponse {
        private Long operatorId;
        private String operatorName;
        private String band;
        private String dataMonth;
        private List<BandIndicatorResponse> indicators;
    }
}