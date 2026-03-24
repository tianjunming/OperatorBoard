package com.agent.dataservice.entity;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class CarrierData {
    private Long id;
    private Long carrierId;
    private String frequencyBand;
    private String siteName;
    private String cellId;
    private BigDecimal uplinkRate;
    private BigDecimal downlinkRate;
    private BigDecimal prbUtilization;
    private BigDecimal longitude;
    private BigDecimal latitude;
    private String location;
    private Integer status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // For join results
    private String carrierName;
    private String carrierCode;
}
