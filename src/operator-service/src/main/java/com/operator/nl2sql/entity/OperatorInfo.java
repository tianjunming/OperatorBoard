package com.operator.nl2sql.entity;

import lombok.Data;
import java.time.LocalDateTime;

/**
 * 运营商维度表
 * Star Schema: Dimension Table for Operators
 */
@Data
public class OperatorInfo {
    private Long id;
    private String operatorCode;
    private String operatorName;
    private String aliasName;
    private String country;
    private String region;
    private String networkType;
    private Integer status;
    private LocalDateTime createdTime;
    private LocalDateTime updatedTime;
}
