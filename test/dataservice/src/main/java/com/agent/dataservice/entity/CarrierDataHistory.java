package com.agent.dataservice.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CarrierDataHistory {
    private Long id;
    private Long carrierId;
    private Long carrierDataId;
    private String dataDescription;
    private LocalDateTime dataTime;
    private BigDecimal uplinkRate;
    private BigDecimal downlinkRate;
    private BigDecimal prbUtilization;
    private LocalDateTime createdAt;

    // For join results
    private String carrierName;
    private String carrierCode;
}
