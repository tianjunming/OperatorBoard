package com.operator.nl2sql.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class OperatorInfo {
    private Long id;
    private String operatorName;
    private String region;
    private String networkType;
    private LocalDateTime createdAt;
}
