package com.operator.nl2sql.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OperatorInfo {
    private Long id;
    private String operatorName;
    private String country;
    private String region;
    private String networkType;
    private String dataMonth;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
